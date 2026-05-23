/*
  Warnings:

  - You are about to drop the column `list` on the `order` table. All the data in the column will be lost.
  - The primary key for the `orderList` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `listId` on the `orderList` table. All the data in the column will be lost.
  - Added the required column `listId` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `orderList` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_list_fkey";

-- AlterTable
ALTER TABLE "order" DROP COLUMN "list",
ADD COLUMN     "listId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "orderList" DROP CONSTRAINT "orderList_pkey",
DROP COLUMN "listId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "orderList_pkey" PRIMARY KEY ("userId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_listId_fkey" FOREIGN KEY ("listId") REFERENCES "orderList"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
