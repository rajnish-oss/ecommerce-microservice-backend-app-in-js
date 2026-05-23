-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'SHIPPED');

-- CreateTable
CREATE TABLE "orderList" (
    "listId" INTEGER NOT NULL,

    CONSTRAINT "orderList_pkey" PRIMARY KEY ("listId")
);

-- CreateTable
CREATE TABLE "order" (
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "list" INTEGER NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("orderId")
);

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_list_fkey" FOREIGN KEY ("list") REFERENCES "orderList"("listId") ON DELETE RESTRICT ON UPDATE CASCADE;
