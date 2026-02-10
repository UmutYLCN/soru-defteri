-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "groupId" INTEGER;

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" SERIAL NOT NULL,
    "stemText" TEXT NOT NULL,
    "stemTextEN" TEXT,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
