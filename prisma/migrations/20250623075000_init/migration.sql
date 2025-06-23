-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "General_information" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "detection_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "General_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processing_Performance" (
    "id" SERIAL NOT NULL,
    "dsp_time" DOUBLE PRECISION NOT NULL,
    "classification_time" DOUBLE PRECISION NOT NULL,
    "anomaly_time" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Processing_Performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Email_email_key" ON "Email"("email");
