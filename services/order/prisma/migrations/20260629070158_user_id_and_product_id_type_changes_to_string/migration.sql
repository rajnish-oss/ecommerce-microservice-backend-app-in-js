/*
  Warnings:

  - The primary key for the `order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `orderList` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_listId_fkey";

-- AlterTable
ALTER TABLE "order" DROP CONSTRAINT "order_pkey",
ALTER COLUMN "productId" SET DATA TYPE TEXT,
ALTER COLUMN "listId" SET DATA TYPE TEXT,
ADD CONSTRAINT "order_pkey" PRIMARY KEY ("listId", "productId");

-- AlterTable
ALTER TABLE "orderList" DROP CONSTRAINT "orderList_pkey",
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "orderList_pkey" PRIMARY KEY ("userId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_listId_fkey" FOREIGN KEY ("listId") REFERENCES "orderList"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
