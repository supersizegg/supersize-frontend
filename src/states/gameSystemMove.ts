import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
  COMPONENT_PLAYER_ID,
  COMPONENT_MAP_ID,
  SYSTEM_EAT_FOOD_ID,
  SYSTEM_EAT_BLOB_ID,
  COMPONENT_SECTION_ID,
  SYSTEM_MOVE_BLOB_ID,
  SYSTEM_SPLIT_BLOB_ID,
} from "./gamePrograms";
import { ActiveGame, Blob } from "@utils/types";
import { getSectionIndex, averageCircleCoordinates, checkPlayerDistances, findListIndex, getClampedFoodPosition } from "@utils/helper";

export async function gameSystemMove(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  currentPlayerEntity: PublicKey,
  currentPlayer: Blob,
  entityMatch: PublicKey,
  foodEntities: PublicKey[],
  playerEntities: PublicKey[],
  allplayers: Blob[],
  players: Blob[],
  foodListLen: number[],
  mousePositionX: number,
  mousePositionY: number,
  isMouseDown: boolean,
  screenSize: { width: number; height: number },
) {
  try {

    const newX = Math.max(
      0,
      Math.min(screenSize.width, Math.floor(currentPlayer.x + mousePositionX - window.innerWidth / 2)),
    );
    const newY = Math.max(
      0,
      Math.min(screenSize.height, Math.floor(currentPlayer.y + mousePositionY - window.innerHeight / 2)),
    );

    const alltransaction = new anchor.web3.Transaction();
    if(isMouseDown) {
      const splitBlob = await ApplySystem({
        authority: engine.getSessionPayer(),
        world: gameInfo.worldPda,
        entities: [
          {
            entity: currentPlayerEntity,
            components: [{ componentId: COMPONENT_PLAYER_ID }],
          },
          {
            entity: entityMatch,
            components: [{ componentId: COMPONENT_MAP_ID }],
          },
        ],
        systemId: SYSTEM_SPLIT_BLOB_ID,
        args: {
          timestamp: performance.now(),
        },
      });

      alltransaction.add(splitBlob.transaction);
    }

    const playerstoeat = checkPlayerDistances(players, currentPlayer.circles); //should return index of player to eat
    if (playerstoeat) {
      const playersListIndex = findListIndex(playerstoeat, allplayers);
      if (playersListIndex != null) {
        const eatPlayerTx = await ApplySystem({
          authority: engine.getSessionPayer(),
          world: gameInfo.worldPda,
          entities: [
            {
              entity: currentPlayerEntity,
              components: [{ componentId: COMPONENT_PLAYER_ID }],
            },
            {
              entity: playerEntities[playersListIndex],
              components: [{ componentId: COMPONENT_PLAYER_ID }],
            },
            {
              entity: entityMatch,
              components: [{ componentId: COMPONENT_MAP_ID }],
            },
          ],
          systemId: SYSTEM_EAT_BLOB_ID,
          args: {
            timestamp: performance.now(),
          },
        });

        alltransaction.add(eatPlayerTx.transaction);
      }
    }

    //index should be selected blob index
    for (let i = 0; i < currentPlayer.circles.length; i++) {
      const currentSection = getSectionIndex(currentPlayer.circles[i].x, currentPlayer.circles[i].y, gameInfo.size, 1);
      const eatFoodTx = await ApplySystem({
        authority: engine.getSessionPayer(),
        world: gameInfo.worldPda,
        entities: [
          {
            entity: currentPlayerEntity,
            components: [{ componentId: COMPONENT_PLAYER_ID }],
          },
          {
            entity: foodEntities[currentSection],
            components: [{ componentId: COMPONENT_SECTION_ID }],
          },
        ],
        systemId: SYSTEM_EAT_FOOD_ID,
        args: {
          index: i,
          timestamp: performance.now(),
        },
      });
      alltransaction.add(eatFoodTx.transaction);
    }
    
    const makeMove = await ApplySystem({
      authority: engine.getSessionPayer(),
      world: gameInfo.worldPda,
      entities: [
        {
          entity: currentPlayerEntity,
          components: [{ componentId: COMPONENT_PLAYER_ID }],
        },
        {
          entity: entityMatch,
          components: [{ componentId: COMPONENT_MAP_ID }],
        },
      ],
      systemId: SYSTEM_MOVE_BLOB_ID,
      args: {
        x: newX,
        y: newY,
        timestamp: performance.now(),
      },
    });

    alltransaction.add(makeMove.transaction);

    await engine.processSessionEphemTransactionNoConfirm("txn:" + performance.now(), alltransaction).catch((error) => {
      console.log(error);
    });
    // eslint-disable-next-line
  } catch (error) {}
}
