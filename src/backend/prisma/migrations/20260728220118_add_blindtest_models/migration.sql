-- CreateEnum
CREATE TYPE "BlindtestGameStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- CreateTable
CREATE TABLE "BlindtestGame" (
    "id" SERIAL NOT NULL,
    "status" "BlindtestGameStatus" NOT NULL DEFAULT 'WAITING',
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "BlindtestGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindtestPlayer" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "BlindtestPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindtestRound" (
    "id" SERIAL NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackDeezerId" INTEGER NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "trackArtist" TEXT NOT NULL,
    "trackPreviewUrl" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "BlindtestRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindtestAnswer" (
    "id" SERIAL NOT NULL,
    "answerText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" INTEGER NOT NULL,
    "roundId" INTEGER NOT NULL,

    CONSTRAINT "BlindtestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlindtestGame_sessionId_key" ON "BlindtestGame"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "BlindtestPlayer_userId_gameId_key" ON "BlindtestPlayer"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "BlindtestRound_gameId_roundNumber_key" ON "BlindtestRound"("gameId", "roundNumber");

-- AddForeignKey
ALTER TABLE "BlindtestPlayer" ADD CONSTRAINT "BlindtestPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindtestPlayer" ADD CONSTRAINT "BlindtestPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "BlindtestGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindtestRound" ADD CONSTRAINT "BlindtestRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "BlindtestGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindtestAnswer" ADD CONSTRAINT "BlindtestAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "BlindtestPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindtestAnswer" ADD CONSTRAINT "BlindtestAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "BlindtestRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
