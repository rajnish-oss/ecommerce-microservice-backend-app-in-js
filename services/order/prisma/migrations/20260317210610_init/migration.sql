/*
  Warnings:

  - The primary key for the `order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `orderId` on the `order` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order" DROP CONSTRAINT "order_pkey",
DROP COLUMN "orderId",
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD CONSTRAINT "order_pkey" PRIMARY KEY ("listId", "productId");
