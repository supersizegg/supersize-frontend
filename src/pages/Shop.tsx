import React, { useEffect, useMemo, useReducer, useRef } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import TradingViewWidget from "@components/util/TradingViewWidget";
import { VersionedTransaction } from "@solana/web3.js";
import { useMagicBlockEngine } from "@engine/MagicBlockEngineProvider";
import "./Shop.scss";
import AnimatedBackground from "../components/util/AnimatedBackground";

const TOKEN_NAME = "PYUSD";
const OUTPUT_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";
const OUTPUT_DECIMALS = 6;
const SOL_MINT = "So11111111111111111111111111111111111111112";

const USD_MIN = 1;
const USD_MAX = 50;
const USD_STEP = 1;

const COINGECKO_SOL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const COINGECKO_TOKEN =
  "https://api.coingecko.com/api/v3/simple/price?ids=paypal-usd&vs_currencies=usd&include_24hr_change=true";

const API_URLS = {
  BASE_HOST: "https://api-v3.raydium.io",
  SWAP_HOST: "https://transaction-v1.raydium.io",
  PRIORITY_FEE: "/main/auto-fee",
};

const RAY_SWAP_HOST = API_URLS.SWAP_HOST;
const RAY_PRIORITY_FEE = `${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`;
const SLIPPAGE_BPS = 100;
const TX_VERSION = "V0";

interface ShopProps {
  tokenBalance: number;
}

type State = {
  usd: number;
  solPrice: number | null;
  tokenPrice: number | null;
  token24hChange: number | null;
  estOut: string | null;
  fees: string | null;
  waiting: boolean;
  status: { type: "idle" | "info" | "success" | "error"; message: string } | null;
};

type Action =
  | { type: "SET_USD"; usd: number }
  | {
      type: "SET_MARKET";
      solPrice?: number | null;
      tokenPrice?: number | null;
      token24hChange?: number | null;
    }
  | { type: "SET_ESTIMATE"; out: string | null; fees: string | null }
  | { type: "WAIT"; on: boolean }
  | { type: "STATUS"; status: State["status"] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_USD":
      return { ...state, usd: action.usd };
    case "SET_MARKET":
      return {
        ...state,
        solPrice: action.solPrice ?? state.solPrice,
        tokenPrice: action.tokenPrice ?? state.tokenPrice,
        token24hChange: action.token24hChange ?? state.token24hChange,
      };
    case "SET_ESTIMATE":
      return { ...state, estOut: action.out, fees: action.fees };
    case "WAIT":
      return { ...state, waiting: action.on };
    case "STATUS":
      return { ...state, status: action.status };
    default:
      return state;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatUSD(n: number | null) {
  if (n == null || Number.isNaN(n)) return "–";
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number | null, maxFrac = 6) {
  if (n == null || Number.isNaN(n)) return "–";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac }).format(n);
}

function toUiAmountFromRaw(raw: unknown, decimals: number): number {
  const n = typeof raw === "string" ? Number(raw) : Number(raw as any);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function retry<T>(fn: (signal: AbortSignal) => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  const ctrl = new AbortController();
  try {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn(ctrl.signal);
      } catch (e) {
        if (i === attempts - 1) throw e;
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
      }
    }
    return null as never;
  } finally {
    ctrl.abort();
  }
}

const Shop: React.FC<ShopProps> = ({ tokenBalance }) => {
  const { engine } = useMagicBlockEngine();

  const [state, dispatch] = useReducer(reducer, {
    usd: 5,
    solPrice: null,
    tokenPrice: null,
    token24hChange: null,
    estOut: null,
    fees: null,
    waiting: false,
    status: null,
  });

  const pollingRef = useRef<number | null>(null);
  const walletConnected = useMemo(() => !!engine?.getWalletConnected?.(), [engine]);

  useEffect(() => {
    let canceled = false;

    const pull = async () => {
      try {
        const [sol, tok] = await Promise.all([
          retry<{ solana: { usd: number } }>((signal) => fetchJSON(COINGECKO_SOL, signal)),
          retry<{ "paypal-usd": { usd: number; usd_24h_change: number } }>((signal) =>
            fetchJSON(COINGECKO_TOKEN, signal),
          ),
        ]);
        if (canceled) return;
        dispatch({
          type: "SET_MARKET",
          solPrice: sol.solana.usd,
          tokenPrice: tok["paypal-usd"].usd,
          token24hChange: tok["paypal-usd"].usd_24h_change,
        });
      } catch {
        if (!canceled)
          dispatch({
            type: "STATUS",
            status: { type: "error", message: "Live prices unavailable. Retrying..." },
          });
      }
    };

    pull();
    pollingRef.current = window.setInterval(pull, 60 * 1000);
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    const getEstimate = async () => {
      if (!state.solPrice) return;
      const usd = clamp(state.usd, USD_MIN, USD_MAX);
      const solAmount = usd / state.solPrice;
      if (!Number.isFinite(solAmount) || solAmount <= 0) return;
      const lamports = Math.floor(solAmount * 1e9);
      if (lamports <= 0) return;

      try {
        const computeUrl =
          `${RAY_SWAP_HOST}/compute/swap-base-in` +
          `?inputMint=${SOL_MINT}&outputMint=${OUTPUT_MINT}` +
          `&amount=${lamports}&slippageBps=${SLIPPAGE_BPS}&txVersion=${TX_VERSION}`;

        const compute = await retry<any>((signal) => fetchJSON(computeUrl, signal));
        if (canceled) return;

        const outRaw = compute?.data?.amountOut ?? compute?.data?.outputAmount ?? compute?.data?.outAmount ?? null;

        const out = outRaw != null ? toUiAmountFromRaw(outRaw, OUTPUT_DECIMALS) : null;

        dispatch({
          type: "SET_ESTIMATE",
          out: out && out > 0 ? `${formatNumber(out, Math.min(OUTPUT_DECIMALS, 6))} ${TOKEN_NAME}` : null,
          fees: null,
        });
      } catch {
        if (!canceled) dispatch({ type: "SET_ESTIMATE", out: null, fees: null });
      }
    };

    getEstimate();
    return () => {
      canceled = true;
    };
  }, [state.usd, state.solPrice]);

  const buyToken = async () => {
    if (!engine || !engine.getWalletConnected?.()) {
      dispatch({
        type: "STATUS",
        status: { type: "error", message: "Please sign in to continue." },
      });
      return;
    }

    try {
      dispatch({ type: "WAIT", on: true });
      dispatch({ type: "STATUS", status: { type: "info", message: "Preparing your swap…" } });

      const sol = await retry<{ solana: { usd: number } }>((signal) => fetchJSON(COINGECKO_SOL, signal));
      const solPrice = sol.solana.usd;
      dispatch({ type: "SET_MARKET", solPrice });

      const usd = clamp(state.usd, USD_MIN, USD_MAX);
      const solAmount = usd / solPrice;
      const lamports = Math.floor(solAmount * 1e9);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error("Invalid amount");

      const feeTiers = await retry<any>((signal) => fetchJSON(RAY_PRIORITY_FEE, signal));
      const computeUnitPriceMicroLamports = String(feeTiers?.data?.default?.h ?? 6000);

      const computeUrl =
        `${RAY_SWAP_HOST}/compute/swap-base-in` +
        `?inputMint=${SOL_MINT}&outputMint=${OUTPUT_MINT}` +
        `&amount=${lamports}&slippageBps=${SLIPPAGE_BPS}&txVersion=${TX_VERSION}`;
      const swapResponse = await retry<any>((signal) => fetchJSON(computeUrl, signal));

      const txRes = await fetch(`${RAY_SWAP_HOST}/transaction/swap-base-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          computeUnitPriceMicroLamports,
          swapResponse,
          txVersion: TX_VERSION,
          wallet: engine.getWalletPayer().toBase58(),
          wrapSol: true,
          unwrapSol: false,
        }),
      });
      if (!txRes.ok) throw new Error(`Raydium swap HTTP ${txRes.status}`);
      const txJson = await txRes.json();

      const txs: string[] = txJson?.data?.map((d: any) => d.transaction) ?? [];
      if (!txs.length) throw new Error("No transaction returned by Raydium.");

      //@ts-expect-error
      const walletContext: any = engine.walletContext as any;
      for (const b64 of txs) {
        const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
        const sig = await walletContext.sendTransaction(tx, engine.getConnectionChain());
        await engine.getConnectionChain().confirmTransaction(sig, "confirmed");
      }

      dispatch({
        type: "STATUS",
        status: {
          type: "success",
          message: `Success! You bought ${state.estOut ?? "tokens"}. Go to profile to deposit them for play.`,
        },
      });
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "Failed to complete purchase.";
      dispatch({ type: "STATUS", status: { type: "error", message: msg } });
    } finally {
      dispatch({ type: "WAIT", on: false });
    }
  };

  return (
    <div className="shop-page">
      <AnimatedBackground />
      <MenuBar tokenBalance={tokenBalance} />

      <main className="shop-container">
        <div className="chart-column">
          <div className="ticker" role="group" aria-label={`${TOKEN_NAME} price and 24 hour change`}>
            <div className="ticker-section">
              <img src="/slime.png" className="asset-icon" alt={TOKEN_NAME} />
              <span className="ticker-amount">1 {TOKEN_NAME}</span>
            </div>
            <img src="/transaction.png" className="arrow-icon" alt="is worth" />
            <div className="ticker-section">
              <span className="price">{state.tokenPrice != null ? formatUSD(state.tokenPrice) : "–"}</span>
              <img src="/usdc.png" className="asset-icon" alt="USD" />
              {state.token24hChange != null && (
                <div
                  className="change"
                  data-direction={state.token24hChange >= 0 ? "up" : "down"}
                  aria-label={`24 hour change ${state.token24hChange.toFixed(2)} percent`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    {state.token24hChange >= 0 ? <path d="M6 2l4 8H2l4-8z" /> : <path d="M6 10L2 2h8L6 10z" />}
                  </svg>
                  <span>
                    {state.token24hChange >= 0
                      ? `+${state.token24hChange.toFixed(2)}`
                      : state.token24hChange.toFixed(2)}
                    %
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="chart-container">
            <TradingViewWidget />
          </div>
        </div>

        <div className="trade-column">
          <h1 className="trade-title">Buy {TOKEN_NAME}</h1>

          <div className="input-group">
            <input
              id="usd"
              type="number"
              min={USD_MIN}
              max={USD_MAX}
              step={USD_STEP}
              inputMode="decimal"
              className="usd-input"
              aria-label="US dollars to spend"
              value={state.usd}
              onChange={(e) => {
                const v = clamp(Number(e.target.value || 0), USD_MIN, USD_MAX);
                dispatch({ type: "SET_USD", usd: v });
              }}
            />
            <span className="usd-suffix">USD</span>
          </div>

          <input
            type="range"
            min={USD_MIN}
            max={USD_MAX}
            step={USD_STEP}
            aria-label="Dollars slider"
            value={state.usd}
            onChange={(e) => dispatch({ type: "SET_USD", usd: Number(e.target.value) })}
            className="shop-slider"
          />

          <div className="estimate-box" aria-live="polite">
            <div className="estimate-line">
              <span>You will buy</span>
              <strong>{state.estOut ?? "–"}</strong>
            </div>
            <div className="estimate-line muted">
              <span>With</span>
              <strong>{formatUSD(state.usd)}</strong>
            </div>
          </div>

          <button
            className="buy-btn"
            onClick={buyToken}
            disabled={!walletConnected || state.waiting}
            aria-busy={state.waiting}
          >
            {state.waiting ? "Processing…" : `Buy ${TOKEN_NAME}`}
          </button>

          {state.status && (
            <div className="notice" data-type={state.status.type} role="status" aria-live="polite">
              {state.status.message}
            </div>
          )}
        </div>
      </main>

      <BackButton />
    </div>
  );
};

export default Shop;
