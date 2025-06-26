/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/exit_game.json`.
 */
export type ExitGame = {
  "address": "wdH5MUvXcyKM58yffCxhRQfB5jLQHpnWZhhdYhLCThf",
  "metadata": {
    "name": "exitGame",
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
    },
    {
      "name": "initExtraAccounts",
      "discriminator": [
        58,
        71,
        119,
        115,
        48,
        174,
        40,
        177
      ],
      "accounts": [
        {
          "name": "supersizeVaultProgram",
          "address": "DZtWbzgheM9YEaQu24dR3bkvWHURhSZw5jFwZyoz95DH"
        },
        {
          "name": "gameWallet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  45,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "parentKey"
              }
            ]
          }
        },
        {
          "name": "userBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "parentKey"
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "gameBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "map"
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "player"
        },
        {
          "name": "map"
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "parentKey"
        },
        {
          "name": "exitAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  105,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "map"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "instructionSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "payer",
          "writable": true
        }
      ],
      "args": []
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
    },
    {
      "code": 6003,
      "name": "wrongToken",
      "msg": "Incorrect token address."
    },
    {
      "code": 6004,
      "name": "exitLocked",
      "msg": "Can't exit."
    },
    {
      "code": 6005,
      "name": "forbidden",
      "msg": "Forbidden action."
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
