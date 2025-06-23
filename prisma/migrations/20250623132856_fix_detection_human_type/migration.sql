/*
  Warnings:

  - Added the required column `detection_human` to the `General_information` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "General_information" ADD COLUMN     "detection_human" BOOLEAN NOT NULL;
