/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/supersize_vault.json`.
 */
export type SupersizeVault = {
  "address": "DZtWbzgheM9YEaQu24dR3bkvWHURhSZw5jFwZyoz95DH",
  "metadata": {
    "name": "supersizeVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burnFromGame",
      "discriminator": [
        148,
        195,
        140,
        122,
        69,
        108,
        88,
        195
      ],
      "accounts": [
        {
          "name": "balance",
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
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "burnAccount",
          "writable": true,
          "address": "5NsVbMzfpXSyeGsuzMVDfz7kspFcCQSTFcKL7wBuogNS"
        },
        {
          "name": "map"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "buyIn",
      "discriminator": [
        126,
        94,
        133,
        165,
        163,
        236,
        161,
        152
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
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
          "name": "parentKey"
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "player"
        },
        {
          "name": "map"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "cashOut",
      "discriminator": [
        1,
        110,
        57,
        58,
        159,
        157,
        243,
        192
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
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
          "name": "parentKey"
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "player"
        },
        {
          "name": "map"
        },
        {
          "name": "exitAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "delegateGame",
      "discriminator": [
        116,
        183,
        70,
        107,
        112,
        223,
        122,
        210
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "map"
        },
        {
          "name": "bufferBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "balance"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                186,
                185,
                18,
                110,
                228,
                200,
                25,
                18,
                164,
                223,
                146,
                238,
                103,
                215,
                151,
                110,
                147,
                146,
                123,
                57,
                52,
                79,
                10,
                125,
                127,
                134,
                227,
                121,
                59,
                109,
                171,
                232
              ]
            }
          }
        },
        {
          "name": "delegationRecordBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "balance"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "balance"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "balance",
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
          "name": "ownerProgram",
          "address": "DZtWbzgheM9YEaQu24dR3bkvWHURhSZw5jFwZyoz95DH"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "validatorPubkey",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "delegatePlayerProfile",
      "discriminator": [
        62,
        94,
        178,
        63,
        186,
        116,
        36,
        143
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferPlayerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "playerProfile"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                186,
                185,
                18,
                110,
                228,
                200,
                25,
                18,
                164,
                223,
                146,
                238,
                103,
                215,
                151,
                110,
                147,
                146,
                123,
                57,
                52,
                79,
                10,
                125,
                127,
                134,
                227,
                121,
                59,
                109,
                171,
                232
              ]
            }
          }
        },
        {
          "name": "delegationRecordPlayerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "playerProfile"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPlayerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "playerProfile"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "DZtWbzgheM9YEaQu24dR3bkvWHURhSZw5jFwZyoz95DH"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "validatorPubkey",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "delegatePlayerProfileFree",
      "discriminator": [
        49,
        26,
        89,
        47,
        232,
        143,
        41,
        101
      ],
      "accounts": [
        {
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "validatorPubkey",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken",
          "writable": true,
          "address": "B1aHFyLNzm1y24gkhASHiBU7LH6xXV2V785S4MrtY777"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositToGame",
      "discriminator": [
        250,
        164,
        120,
        131,
        56,
        191,
        133,
        137
      ],
      "accounts": [
        {
          "name": "balance",
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
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "map"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "newGame",
      "discriminator": [
        211,
        13,
        182,
        128,
        71,
        187,
        248,
        202
      ],
      "accounts": [
        {
          "name": "balance",
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
          "name": "mintOfToken"
        },
        {
          "name": "map"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "newUserBalance",
      "discriminator": [
        95,
        42,
        85,
        230,
        133,
        45,
        249,
        224
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "undelegateGame",
      "discriminator": [
        40,
        145,
        154,
        66,
        48,
        111,
        127,
        1
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "map"
        },
        {
          "name": "balance",
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
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "undelegatePlayerProfile",
      "discriminator": [
        77,
        211,
        17,
        167,
        218,
        208,
        86,
        149
      ],
      "accounts": [
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "parentKey"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "parentKey",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "undelegateUser",
      "discriminator": [
        116,
        139,
        246,
        224,
        235,
        172,
        97,
        25
      ],
      "accounts": [
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameWallet",
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
                "kind": "arg",
                "path": "parentKey"
              }
            ]
          }
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "balance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
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
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "parentKey",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "undelegateWallet",
      "discriminator": [
        194,
        210,
        11,
        84,
        124,
        75,
        13,
        160
      ],
      "accounts": [
        {
          "name": "wallet",
          "writable": true,
          "signer": true
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
                "kind": "arg",
                "path": "parentKey"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "parentKey",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  45,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken",
          "writable": true,
          "address": "B1aHFyLNzm1y24gkhASHiBU7LH6xXV2V785S4MrtY777"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawFromGame",
      "discriminator": [
        121,
        195,
        6,
        176,
        60,
        42,
        27,
        153
      ],
      "accounts": [
        {
          "name": "balance",
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
          "name": "tokenAccountOwnerPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  111,
                  119,
                  110,
                  101,
                  114,
                  95,
                  112,
                  100,
                  97
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  112,
                  101,
                  114,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mintOfToken"
              }
            ]
          }
        },
        {
          "name": "mintOfToken"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "map"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Accept **either** SPL Token or Token-2022 at runtime"
          ]
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "balance",
      "discriminator": [
        127,
        71,
        25,
        157,
        105,
        157,
        241,
        182
      ]
    },
    {
      "name": "playerProfile",
      "discriminator": [
        82,
        226,
        99,
        87,
        164,
        130,
        181,
        80
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6001,
      "name": "balanceOverflow",
      "msg": "Balance Overflow"
    },
    {
      "code": 6002,
      "name": "notAuthorized",
      "msg": "Not Authorized"
    },
    {
      "code": 6003,
      "name": "gameDoesNotExist",
      "msg": "Game Does Not Exist"
    },
    {
      "code": 6004,
      "name": "insufficientGameBalance",
      "msg": "Insufficient Game Balance"
    },
    {
      "code": 6005,
      "name": "mapKeyMismatch",
      "msg": "Map And Player Key Don't Match"
    },
    {
      "code": 6006,
      "name": "invalidAuthority",
      "msg": "Invalid Authority"
    },
    {
      "code": 6007,
      "name": "unauthorizedCaller",
      "msg": "Unauthorized Caller"
    },
    {
      "code": 6008,
      "name": "airdropCooldown",
      "msg": "Airdrop still in cooldown"
    },
    {
      "code": 6009,
      "name": "wrongToken",
      "msg": "Wrong token provided"
    }
  ],
  "types": [
    {
      "name": "balance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "balance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "playerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "sessionAuthority",
            "type": "pubkey"
          },
          {
            "name": "slimecoinBalance",
            "type": "u64"
          },
          {
            "name": "totalWagered",
            "type": "u64"
          },
          {
            "name": "totalEarnedF2p",
            "type": "u64"
          },
          {
            "name": "totalEarnedP2p",
            "type": "u64"
          },
          {
            "name": "playtimeSecondsF2p",
            "type": "u64"
          },
          {
            "name": "playtimeSecondsP2p",
            "type": "u64"
          },
          {
            "name": "f2pJoins",
            "type": "u64"
          },
          {
            "name": "f2pExits",
            "type": "u64"
          },
          {
            "name": "p2pJoins",
            "type": "u64"
          },
          {
            "name": "p2pExits",
            "type": "u64"
          },
          {
            "name": "lastResetSlot",
            "type": "u64"
          },
          {
            "name": "seasonId",
            "type": "u16"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
