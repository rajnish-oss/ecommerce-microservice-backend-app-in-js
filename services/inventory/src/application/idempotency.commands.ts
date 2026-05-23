import { prisma } from "../db";

async function isAlreadyProcessed(eventId: string) {
    const event = await prisma.processedEvent.findUnique({
        where:{
            eventId: eventId
        }
    })

    return event ? true : false;

}

async function markAsProcessed(eventId: string) {
    const event = await prisma.processedEvent.create({
        data:{
            eventId: eventId
        }
    })

}

export { isAlreadyProcessed, markAsProcessed };

