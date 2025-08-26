import React, { useEffect, useRef, useState } from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { FetchedGame } from "@utils/types";
import TxnModal from "@components/TxnModal/TxnModal";
import { useWallet } from "@solana/wallet-adapter-react";
import { gameExecuteNewGame } from "../../states/gameExecuteNewGame";
import "./CreateGameForm.scss";

type gameProps = {
  game_size: number;
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
  selectedServer: string;
  userKey: string;
};

type FormData = [number, number, string, string, string];

const CreateGameForm: React.FC<gameProps> = ({
  game_size,
  activeGamesLoaded,
  setActiveGamesLoaded,
  selectedServer,
  userKey,
}) => {
  const { engine, setEndpointEphemRpc } = useMagicBlockEngine();
  const { publicKey } = useWallet();

  const [formData, setFormData] = useState<FormData>([
    game_size,
    1.0,
    userKey,
    "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp",
    "To the moon!",
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameCreated, setGameCreated] = useState(false);
  const [transactions, setTransactions] = useState<{ id: string; status: string }[]>([]);
  const [newGameId, setNewGameId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const resolveFnRef = useRef<(value: boolean) => void>();

  function showPrompt(errorMessage: string): Promise<boolean> {
    setErrorMessage(errorMessage);
    return new Promise<boolean>((resolve) => {
      resolveFnRef.current = resolve;
    });
  }

  useEffect(() => {
    setTransactions([]);
    setNewGameId("");
    setGameCreated(false);
  }, []);

  useEffect(() => {
    const updatedFormData = [...formData] as FormData;
    updatedFormData[0] = game_size;
    setFormData(updatedFormData);
  }, [game_size]);

  useEffect(() => {
    try {
      //let userKey = engine.getWalletPayer().toString();
      //setFormData((prev) => ({ ...prev, 2: userKey }));
      const updatedFormData = [...formData] as FormData;
      updatedFormData[2] = engine.getWalletPayer().toString();
      setFormData(updatedFormData);
    } catch (e) {
      console.log(e);
    }
  }, [engine]);

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const updatedFormData = [...formData] as FormData;
    if(updatedFormData) {
      if (index >= 2) {
        updatedFormData[index] = value as string;
      } else {
        updatedFormData[index] = parseFloat(value) as number;
      }
      setFormData(updatedFormData);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsModalOpen(true);
    console.log("selectedServer", selectedServer);
    const currentEndpoint = engine.getEndpointEphemRpc();
    //setEndpointEphemRpc(selectedServer);
    engine.setTempEndpointEphemRpc(selectedServer);
    gameExecuteNewGame(
      engine,
      selectedServer,
      formData[1],
      formData[2],
      formData[3],
      formData[4],
      activeGamesLoaded,
      setActiveGamesLoaded,
      setTransactions,
      showPrompt,
      setNewGameId,
      setGameCreated,
    ).then(() => {
      engine.setTempEndpointEphemRpc(currentEndpoint);
    }).catch((e) => {
      engine.setTempEndpointEphemRpc(currentEndpoint);
    });
  };

  return (
    <>
      <TxnModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactions={transactions}
        setTransactions={setTransactions}
        errorMessage={errorMessage}
        newGameId={newGameId}
        gameCreated={gameCreated}
        handleUserRetry={() => {
          if (resolveFnRef.current) resolveFnRef.current(true);
        }}
      />
      <form className="create-game-form" onSubmit={handleSubmit}>
        <label className="form-label">
          <span className="label-text">Name</span>
          <input type="text" className="form-input" name="game_name" value={formData[4]} onChange={handleChange(4)} />
        </label>
        <label className="form-label">
          <span className="label-text">Buy-In</span>
          <input
            type="number"
            className="form-input no-arrows"
            name="buy_in_min"
            value={formData[1]}
            onChange={handleChange(1)}
          />
        </label>
        <label className="form-label">
          <span className="label-text">Token (mint address)</span>
          <input
            type="text"
            className="form-input no-arrows"
            name="game_token"
            value={formData[3]}
            onChange={handleChange(3)}
          />
        </label>
        <label className="form-label">
          <span className="label-text">Game Owner (wallet address)</span>
          <input
            type="text"
            className="form-input no-arrows"
            name="game_owner"
            value={formData[2]}
            onChange={handleChange(2)}
          />
        </label>
        <button type="submit" className="submit-button">
          Create Game
        </button>
      </form>
    </>
  );
};

export default CreateGameForm;
