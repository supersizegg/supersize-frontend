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
    "version": "0.2.3",
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
      "name": "circle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x",
            "type": "u16"
          },
          {
            "name": "y",
            "type": "u16"
          },
          {
            "name": "size",
            "type": "u16"
          },
          {
            "name": "radius",
            "type": "u16"
          },
          {
            "name": "speed",
            "type": "u8"
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
            "name": "gameType",
            "type": "string"
          },
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
            "name": "size",
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
            "name": "activePlayers",
            "type": "u8"
          },
          {
            "name": "valueOnMap",
            "type": "u64"
          },
          {
            "name": "nextFood",
            "type": {
              "vec": {
                "defined": {
                  "name": "mapFood"
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
      "name": "mapFood",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x",
            "type": "u16"
          },
          {
            "name": "y",
            "type": "u16"
          },
          {
            "name": "foodValue",
            "type": "u8"
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
            "name": "gameType",
            "type": "string"
          },
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
            "name": "buyIn",
            "type": "u64"
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
            "name": "joinTime",
            "type": "i64"
          },
          {
            "name": "cooldownTimer",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "removalTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "exitLocked",
            "type": "bool"
          },
          {
            "name": "circles",
            "type": {
              "vec": {
                "defined": {
                  "name": "circle"
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
    }
  ]
};
