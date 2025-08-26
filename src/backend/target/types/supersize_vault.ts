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
      "name": "delegateUser",
      "discriminator": [
        237,
        220,
        199,
        24,
        59,
        41,
        247,
        24
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
                "path": "payer"
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
      "name": "delegateWallet",
      "discriminator": [
        225,
        228,
        159,
        140,
        179,
        143,
        153,
        249
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferWallet",
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
                "path": "wallet"
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
          "name": "delegationRecordWallet",
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
                "path": "wallet"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataWallet",
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
                "path": "wallet"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "wallet",
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
          "name": "balance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              },
              {
                "kind": "account",
                "path": "mintOfToken"
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
      "name": "newGameWallet",
      "discriminator": [
        249,
        14,
        188,
        252,
        16,
        43,
        134,
        135
      ],
      "accounts": [
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
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "gameKey",
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "name": "balance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
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
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
          "name": "balance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
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
      "name": "gameWallet",
      "discriminator": [
        155,
        179,
        160,
        42,
        188,
        125,
        167,
        26
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
      "name": "gameWallet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
