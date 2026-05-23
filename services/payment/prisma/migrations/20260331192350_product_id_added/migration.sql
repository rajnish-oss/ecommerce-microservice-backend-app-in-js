/*
  Warnings:

  - Added the required column `priceId` to the `stripeData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "stripeData" ADD COLUMN     "priceId" TEXT NOT NULL;
