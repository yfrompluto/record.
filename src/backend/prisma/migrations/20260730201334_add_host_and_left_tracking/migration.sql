-- AlterTable
ALTER TABLE "BlindtestGame" ADD COLUMN     "hostUserId" INTEGER;

-- AlterTable
ALTER TABLE "BlindtestPlayer" ADD COLUMN     "hasLeft" BOOLEAN NOT NULL DEFAULT false;
