-- CreateTable
CREATE TABLE "cart" (
    "cardId" INTEGER NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("cardId")
);

-- CreateTable
CREATE TABLE "cartItem" (
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cartId" INTEGER NOT NULL,

    CONSTRAINT "cartItem_pkey" PRIMARY KEY ("cartId","productId")
);

-- AddForeignKey
ALTER TABLE "cartItem" ADD CONSTRAINT "cartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("cardId") ON DELETE RESTRICT ON UPDATE CASCADE;
