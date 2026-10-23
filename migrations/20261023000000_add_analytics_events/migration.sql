CREATE TABLE "AnalyticsEvent" (
    "id" SERIAL NOT NULL,
    "path" VARCHAR(2048) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "referrer" VARCHAR(2048),
    "sessionId" VARCHAR(128) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");
CREATE INDEX "AnalyticsEvent_sessionId_occurredAt_idx" ON "AnalyticsEvent"("sessionId", "occurredAt");
CREATE INDEX "AnalyticsEvent_path_occurredAt_idx" ON "AnalyticsEvent"("path", "occurredAt");
