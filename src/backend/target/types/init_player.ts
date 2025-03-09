/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/init_player.json`.
 */
export type InitPlayer = {
  "address": "58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ",
  "metadata": {
    "name": "initPlayer",
    "version": "0.2.0",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "instructions": [
    {
      "name": "execute2",
      "discriminator": [
        105,
        108,
        50,
        190,
        253,
        180,
        77,
        227
      ],
      "accounts": [
        {
          "name": "player"
        },
        {
          "name": "map"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "argsP",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "map",
      "discriminator": [
        182,
        30,
        142,
        151,
        42,
        241,
        180,
        244
      ]
    },
    {
      "name": "player",
      "discriminator": [
        205,
        222,
        112,
        7,
        165,
        155,
        206,
        218
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAuthorized",
      "msg": "Wallet not authorized."
    },
    {
      "code": 6001,
      "name": "authorityNotFound",
      "msg": "Authority not found."
    }
  ],
  "types": [
    {
      "name": "boltMetadata",
      "docs": [
        "Metadata for the component."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "food",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "map",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "width",
            "type": "u16"
          },
          {
            "name": "height",
            "type": "u16"
          },
          {
            "name": "buyIn",
            "type": "u64"
          },
          {
            "name": "token",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "tokenDecimals",
            "type": "u32"
          },
          {
            "name": "maxPlayers",
            "type": "u8"
          },
          {
            "name": "walletBalance",
            "type": "u64"
          },
          {
            "name": "nextFood",
            "type": {
              "option": {
                "defined": {
                  "name": "food"
                }
              }
            }
          },
          {
            "name": "boltMetadata",
            "type": {
              "defined": {
                "name": "boltMetadata"
              }
            }
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "map",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "status",
            "type": "string"
          },
          {
            "name": "payoutTokenAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "currentGameWalletBalance",
            "type": "u64"
          },
          {
            "name": "x",
            "type": "u16"
          },
          {
            "name": "y",
            "type": "u16"
          },
          {
            "name": "targetX",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "targetY",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "score",
            "type": "u64"
          },
          {
            "name": "mass",
            "type": "u64"
          },
          {
            "name": "foodEaten",
            "type": "u64"
          },
          {
            "name": "playersEaten",
            "type": "u16"
          },
          {
            "name": "speed",
            "type": "f32"
          },
          {
            "name": "joinTime",
            "type": "i64"
          },
          {
            "name": "scheduledRemovalTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "boostClickTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "boltMetadata",
            "type": {
              "defined": {
                "name": "boltMetadata"
              }
            }
          }
        ]
      }
    }
  ]
};
