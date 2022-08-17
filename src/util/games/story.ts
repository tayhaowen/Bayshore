import Long from "long";
import { prisma } from "../..";

// Import Proto
import { wm } from "../../wmmt/wm.proto";

// Import Util
import * as common from "../common";
import * as check_step from "../games/games_util/check_step";


// Save story result
export async function saveStoryResult(body: wm.protobuf.SaveGameResultRequest, car: any)
{
    // If the game was not retired / timed out
    if (!(body.retired || body.timeup)) 
    {
        // Get the story result for the car
        let storyResult = body?.stResult;

        // storyResult is set
        if (storyResult)
        {
            // Check if stClearDivCount is not 0
            let stClearDivCount = undefined;
            if(storyResult.stClearDivCount && storyResult.stClearDivCount !== 0)
            {
                stClearDivCount = storyResult.stClearDivCount
            }

            // Check if stClearCount is not 0
            let stClearCount = undefined;
            if(storyResult.stClearCount && storyResult.stClearCount !== 0)
            {
                stClearCount = storyResult.stClearCount
            }
            
            // Story update data
            let data : any = {
                stClearDivCount: stClearDivCount || undefined, 
                stPlayCount: storyResult.stPlayCount || undefined, 
                stClearCount: stClearCount || undefined, 
                stClearBits: storyResult.stClearBits || undefined,
                stConsecutiveWins: storyResult.stConsecutiveWins || undefined, 
                tuningPoints: storyResult.tuningPoint || 0, 
                stCompleted100Episodes: storyResult.stCompleted_100Episodes || undefined, 
            }

            // If the current consecutive wins is greater than the previous max
            if (body.stResult!.stConsecutiveWins! > car!.stConsecutiveWinsMax) 
            {
                // Update the maximum consecutive wins;
                data.stConsecutiveWinsMax = body.stResult!.stConsecutiveWins!;
            }

            // If the lose bits are set, and are long data
            if (Long.isLong(storyResult.stLoseBits))
            {
                // Convert them to BigInt and add to the data
                data.stLoseBits = common.getBigIntFromLong(storyResult.stLoseBits);

                // If a loss has been recorded
                if (data.stLoseBits > 0)
                {
                    // End the win streak
                    data.stConsecutiveWins = 0;
                }
            }

            // Calling give meter reward function (BASE_PATH/src/util/meter_reward.ts)
            let check_steps = await check_step.checkCurrentStep(body);

            // Set the ghost level to the correct level
            data.ghostLevel = check_steps.ghostLevel;

            // Update the car properties
            await prisma.car.update({
                where: {
                    carId: body.carId
                },
                data: data
            });
        }
    }
}