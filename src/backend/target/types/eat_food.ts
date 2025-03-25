/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/eat_food.json`.
 */
export type EatFood = {
  "address": "EdLga9mFADH4EjPY6RsG1LF7w8utVuWDgyLVRrA8YzzN",
  "metadata": {
    "name": "eatFood",
    "version": "0.2.0",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "instructions": [
    {
      "name": "boltExecute",
      "discriminator": [
        75,
        206,
        62,
        210,
        52,
        215,
        104,
        109
      ],
      "accounts": [
        {
          "name": "authority"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": "bytes"
        }
      ],
      "returns": {
        "vec": "bytes"
      }
    },
    {
      "name": "execute",
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "player"
        },
        {
          "name": "section"
        },
        {
          "name": "map"
        },
        {
          "name": "authority"
        }
      ],
      "args": [
        {
          "name": "argsP",
          "type": "bytes"
        }
      ],
      "returns": {
        "vec": "bytes"
      }
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
    },
    {
      "name": "section",
      "discriminator": [
        2,
        85,
        249,
        212,
        33,
        214,
        36,
        179
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notOwner",
      "msg": "Not owner of this player."
    },
    {
      "code": 6001,
      "name": "notInGame",
      "msg": "Player not in game."
    },
    {
      "code": 6002,
      "name": "mapKeyMismatch",
      "msg": "Component doesn't belong to map."
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
                  "name": "map::Food"
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
    },
    {
      "name": "section",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "map",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "topLeftX",
            "type": "u16"
          },
          {
            "name": "topLeftY",
            "type": "u16"
          },
          {
            "name": "food",
            "type": {
              "vec": {
                "defined": {
                  "name": "section::Food"
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
      "name": "map::Food",
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
      "name": "section::Food",
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
    }
  ]
};
