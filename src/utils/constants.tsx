import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const FOOD_COMPONENT = new PublicKey("BEox2GnPkZ1upBAdUi7FVqTstjsC4tDjsbTpTiE17bah");
export const MAP_COMPONENT = new PublicKey("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb");
export const PLAYER_COMPONENT = new PublicKey("2ewyq31Atu7yLcYMg51CEa22HmcCSJwM4jjHH8kKVAJw");
export const ANTEROOM_COMPONENT = new PublicKey("EbGkJPaMY8XCJCNjkWwk971xzE32X5LBPg5s2g4LDYcW");

export const INIT_PLAYER = new PublicKey("58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ");
export const INIT_ANTEROOM = new PublicKey("AxmRc9buNLgWVMinrH2WunSxKmdsBXVCghhYZgh2hJT6");
export const INIT_GAME = new PublicKey("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");
export const EAT_FOOD = new PublicKey("EdLga9mFADH4EjPY6RsG1LF7w8utVuWDgyLVRrA8YzzN");
export const EAT_PLAYER = new PublicKey("F6rDhVKjVTdGKdxEK9UWfFDcxeT3vFbAckX6U2aWeEKZ");
export const JOIN_GAME = new PublicKey("DViN676ajvuWryjWHxk2EF7MvQLgHNqhj4m32p1xLBDB");
export const MOVEMENT = new PublicKey("9rthxrCfneJKfPtv8PQmYk7hGQsUfeyeDKRp3uC4Uwh6");
export const EXIT_GAME = new PublicKey("wdH5MUvXcyKM58yffCxhRQfB5jLQHpnWZhhdYhLCThf");
export const SPAWN_FOOD = new PublicKey("GP3L2w9SP9DASTJoJdTAQFzEZRHprMLaxGovxeMrvMNe");
export const INIT_FOOD = new PublicKey("4euz4ceqv5ugh1x6wZP3BsLNZHqBxQwXcK59psw5KeQw");
export const BUY_IN = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
export const CASH_OUT = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

export const OPPONENT_COLORS = [
  "#1abc9c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#34495e",
  "#16a085",
  "#27ae60",
  "#2980b9",
  "#8e44ad",
  "#2c3e50",
  "#f1c40f",
  "#e67e22",
  "#e74c3c",
  "#ecf0f1",
  "#95a5a6",
  "#f39c12",
  "#d35400",
  "#c0392b",
  "#bdc3c7",
  "#7f8c8d",
];

export const FOOD_COLORS = [
  "#12F194", // Green
  "#27D7A2",
  "#3DB7B5",
  "#579BCB",
  "#6C7BDE",
  "#825AF0",
  "#9A47FF", // Purple
];

export const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

export const NETWORK = "mainnet"; //process.env.NODE_ENV === "production" ? "mainnet" : "devnet";

export const RPC_CONNECTION = {
  mainnet: "https://staked.helius-rpc.com?api-key=cba33294-aa96-414c-9a26-03d5563aa676",
  devnet: "https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676",
};
export const HELIUS_API_KEY = "07a045b7-c535-4d6f-852b-e7290408c937";

export const API_URL = "https://supersize.miso.one/";

export const endpoints = {
  devnet: [
    "https://supersize-fra.magicblock.app",
    "https://supersize.magicblock.app",
    "https://supersize-sin.magicblock.app",
  ],
  mainnet: [
    "https://supersize-mainnet.magicblock.app",
    "https://supersize-mainnet-bos.magicblock.app",
    "https://supersize-mainnet-sin.magicblock.app",
  ],
};

export const VALIDATOR_MAP = {
  mainnet: {
    MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e: "https://supersize-mainnet.magicblock.app",
    MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd: "https://supersize-mainnet-bos.magicblock.app",
    MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57: "https://supersize-mainnet-sin.magicblock.app",
    // old node
    supEJ87jL3Psb5dK41ZLWtp7xRkurfWrRYJxv6C4o61: "https://supersize-mainnet-bos.magicblock.app",
  },
  devnet: {
    MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e: "https://supersize-fra.magicblock.app",
    MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd: "https://supersize.magicblock.app",
    MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57: "https://supersize-sin.magicblock.app",
    // old node
    supEJ87jL3Psb5dK41ZLWtp7xRkurfWrRYJxv6C4o61: "https://supersize.magicblock.app",
  },
};

export const openTimeHighStakesGames = 1;

export const activeGamesList: {
  [key: string]: { worldId: anchor.BN; worldPda: PublicKey; endpoint: string; permissionless?: boolean, openTime?: number, closeTime?: number }[];
} = {
  devnet: [
    {
      worldId: new anchor.BN(2293),
      worldPda: new PublicKey("6uz1j3v2b2xGM35tMaEiNDhNVfiJjamPZkePtWigqLLP"),
      endpoint: "https://supersize-fra.magicblock.app",
    },
    {
      worldId: new anchor.BN(2334),
      worldPda: new PublicKey("5ywP8AFDBYsNT4uWSXvGBKQ8cjcFX1enz9NcN2dQFGj8"),
      endpoint: "https://supersize.magicblock.app",
    },
  ],
  mainnet: [
    /*
    {
      worldId: new anchor.BN(30),
      worldPda: new PublicKey("32wWEWeWibh1dGiHDgYFBHgJsFeJyL11euW52AopFKV9"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(31),
      worldPda: new PublicKey("FP4LeAEEhdjnGatUBqwdo8TrTe42nrFiiUH5YqA1CqHK"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(32),
      worldPda: new PublicKey("DhdGf7YXxTDDcqW6FEt4MQwExgqFgZbxbDkPn6yErSvj"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(33),
      worldPda: new PublicKey("24McMCDi52oE4WLUPP9mNioswh2vn6h1fJvNASnfYnTi"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
     {
      worldId: new anchor.BN(34),
      worldPda: new PublicKey("9TVACTb1NDtGK3rtEHoBMa1Q8iKnHpLS55uuqudVm2xd"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    }, */
    {
      worldId: new anchor.BN(38),
      worldPda: new PublicKey("DbXfeC37bs1MKXpKQqvL1f3NnCfTUGDoCcSXsYgJfvVw"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    }, 
    {
      worldId: new anchor.BN(43),
      worldPda: new PublicKey("9UVoDwoNmWTwMExQ7nRwAHrniSEfKS3k22NA2XxAi5CC"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(39),
      worldPda: new PublicKey("Bq8dd8YEBSsSDq6tg9pKpeeEZWp54zHtePbCSZ7SmjCj"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(40),
      worldPda: new PublicKey("93uVwXBfQaE15j7VnHz4q2XWt5Vi6Dj4NjabKMipLs4n"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    }, 
    {
      worldId: new anchor.BN(35),
      worldPda: new PublicKey("12MArv4fDwYMJNFXtPjQWuWJaVmKCqLyqz8fZmDQArpd"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(37),
      worldPda: new PublicKey("J9U6W6RM8RHx9aeUnq3uwCUtkv7nUMWnSqZGmqgKCwAY"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    /*
    {
      worldId: new anchor.BN(25),
      worldPda: new PublicKey("FJaojoFH7ZpZvprYVPNfDN6nQ6o8sdMwokHr9GsQUcTK"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(26),
      worldPda: new PublicKey("3RE82NB8WR4MywtBg9ZTzhsKeiczbZgWvVoPBgknqXNv"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(28),
      worldPda: new PublicKey("7u7mNjXYutNqMehBFuDMQSuiyWwLgAAH4RHchYVDWukS"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(16),
      worldPda: new PublicKey("36rykuLPYULiSDuy32oqAZwVr3m3TipDWbRYCbHHjEhc"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(17),
      worldPda: new PublicKey("Cwuyz3xKifLBZA5C8pwg7VcSecRLBwLuTcjdYT3MFpGF"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(22),
      worldPda: new PublicKey("CCFp86dQMkiqgehf47xYMjwSaYUHCwUvyhqpp95go5qV"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(18),
      worldPda: new PublicKey("4vhp2CfuzdvUUpvujnvSW2YYxwk3SXrsF9wSHXCRzJ6s"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(19),
      worldPda: new PublicKey("2KcZfqiCpFdRDQNZa1XC3BKkUWJLGD6HsmPssyuKDd7B"),
      endpoint: "https://supersize-mainnet.magicblock.app",
      permissionless: true,
    },
    {
      worldId: new anchor.BN(20),
      worldPda: new PublicKey("9TEunJAqhwdHGoYhA1K71qQHPty4Te6ieYbXSaK4154J"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
      permissionless: true,
    },
    {
      worldId: new anchor.BN(21),
      worldPda: new PublicKey("4bx6YnBLziQ66GEGNtaYtGzTcciUL6LHquHyEN8M3cr6"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
      permissionless: true,
    },
    {
      worldId: new anchor.BN(1),
      worldPda: new PublicKey("9LKNh9Ma4WjGUHvohbAAdGpZFNUWmgEQRRgvYwRL25ma"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(8),
      worldPda: new PublicKey("B8nxHq1NadQKbuaAwow9vHaCty9LcWrYBtD5db216boR"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(10),
      worldPda: new PublicKey("EEwdyjFd7bUupMq8iwxTSrWivQAR5QCVNUZtnqJR54kU"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(2),
      worldPda: new PublicKey("5Fj5HJud66muuDyateWdP2HAPkED7CnyApDQBMreVQQH"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(7),
      worldPda: new PublicKey("9S7BFk4apJ3ZKVYbt7PSWeJY5n3qnsB4AVJWh1ogyo8r"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(9),
      worldPda: new PublicKey("FpMmtdFbUTCVm1irFaX7aKVfe6XxaWt6xb5nYYv3LUER"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    // {
    //   worldId: new anchor.BN(14),
    //   worldPda: new PublicKey("4W1aGGohXPECTohwzUZA4yxoVVrkSNUVryjJbcL3jagS"),
    //   endpoint: "https://supersize-mainnet-bos.magicblock.app",
    //   permissionless: true,
    // },
    {
      worldId: new anchor.BN(3),
      worldPda: new PublicKey("8XG8vqYo1vxURMXuU7RboftYGVWYq11M41HCzHLYzejt"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(4),
      worldPda: new PublicKey("AGUNzsmCpRp53DPYXY9Yw6Lwg5b5heSkTRyafTkfNYJv"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(11),
      worldPda: new PublicKey("AiS8sVquRX8t17m1ZCi82TqfKVMVvSvUvUibFT9jv33k"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    }, 
    {
      worldId: new anchor.BN(2293),
      worldPda: new PublicKey("6uz1j3v2b2xGM35tMaEiNDhNVfiJjamPZkePtWigqLLP"),
      endpoint: "https://supersize-fra.magicblock.app",
    },
    {
      worldId: new anchor.BN(2047),
      worldPda: new PublicKey("9VaBETe9jda36cuWKr36zE2SR2K1BeDXEU32JqW2ArZN"),
      endpoint: "https://supersize.magicblock.app",
    },
    {
      worldId: new anchor.BN(2046),
      worldPda: new PublicKey("BXrAw3MpuC7b3Dg6xPU7Xzn1vVpWTBegRoHuqh6GzpZp"),
      endpoint: "https://supersize-sin.magicblock.app",
    },
    */
  ],
};

export const options = ["Europe", "America", "Asia"];

export const cachedTokenMetadata: Record<
  string,
  { name: string; symbol: string; decimals?: number; image: string; network: string; raydium?: boolean }
> = {
  /*
  "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn": {
    name: "Adventure Gold (Wormhole)",
    symbol: "AGLD",
    image: `${process.env.PUBLIC_URL}/agld.jpg`,
    network: "mainnet",
    raydium: true,
  }, */
  "B1aHFyLNzm1y24gkhASHiBU7LH6xXV2V785S4MrtY777": {
    name: "Slimecoin",
    symbol: "SLIMECOIN",
    image: `https://www.slimecoin.io/slime.png`,
    network: "mainnet",
  },
  AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp: {
    name: "Magical Gem",
    symbol: "Magical Gem",
    decimals: 9,
    image: `${process.env.PUBLIC_URL}/fallback-token.webp`,
    network: "devnet",
  } /*
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    name: "Bonk",
    symbol: "BONK",
    image: "https://d23exngyjlavgo.cloudfront.net/solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    network: "mainnet",
  }, */,
};

export const API_BASE_URL = "http://localhost:3000/api";
export const scale = 1;
