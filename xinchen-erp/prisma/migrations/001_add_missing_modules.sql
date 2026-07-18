-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "region" VARCHAR(50),
    "visa_policy" JSONB,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "InstitutionType" NOT NULL DEFAULT 'UNIVERSITY',
    "ranking" INTEGER,
    "tuition_range" VARCHAR(100),
    "requirements" JSONB,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "majors" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100),
    "degreeLevel" "DegreeLevel" NOT NULL DEFAULT 'MASTER',
    "duration" VARCHAR(50),
    "language" VARCHAR(50),
    "tuition" DECIMAL(12,2),
    "entryRequirements" JSONB,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "business_line_id" INTEGER,
    "country_id" INTEGER,
    "institution_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "description" JSONB,
    "price" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_packages" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "parent_product_id" INTEGER NOT NULL,
    "child_product_id" INTEGER NOT NULL,
    "discount" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_policies" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "threshold" INTEGER NOT NULL,
    "window_minutes" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL DEFAULT 'WARN',
    "notify_role" VARCHAR(50),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "sign_mode" "ApprovalSignMode" NOT NULL DEFAULT 'AND',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_nodes" (
    "id" SERIAL NOT NULL,
    "flow_id" INTEGER NOT NULL,
    "nodeType" "ApprovalNodeType" NOT NULL DEFAULT 'APPROVE',
    "order_no" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "approver_role" VARCHAR(50),
    "approver_id" INTEGER,
    "condition_expr" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_records" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "flow_id" INTEGER NOT NULL,
    "node_id" INTEGER NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "business_id" INTEGER NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "approver_id" INTEGER,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "attachments" JSONB,
    "current_node_order" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satisfaction_surveys" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "nps" INTEGER,
    "score" INTEGER,
    "dimension_scores" JSONB,
    "feedback" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_visits" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "visitor_id" INTEGER NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "channel" VARCHAR(50),
    "result" "VisitResult" NOT NULL DEFAULT 'NORMAL',
    "summary" TEXT,
    "next_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "level" INTEGER NOT NULL DEFAULT 2,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "handler_id" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "referrer_id" INTEGER NOT NULL,
    "referee_name" VARCHAR(100) NOT NULL,
    "referee_phone" VARCHAR(50),
    "new_student_id" INTEGER,
    "reward_type" VARCHAR(50),
    "reward_amount" DECIMAL(10,2),
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_rules" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "condition_expr" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "notify_roles" VARCHAR(200),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_records" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "RiskRecordStatus" NOT NULL DEFAULT 'OPEN',
    "detail" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_notifications" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "risk_record_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "channel" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "risk_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "countries_tenant_id_idx" ON "countries"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_tenant_id_code_key" ON "countries"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "institutions_tenant_id_idx" ON "institutions"("tenant_id");

-- CreateIndex
CREATE INDEX "institutions_country_id_idx" ON "institutions"("country_id");

-- CreateIndex
CREATE INDEX "majors_tenant_id_idx" ON "majors"("tenant_id");

-- CreateIndex
CREATE INDEX "majors_institution_id_idx" ON "majors"("institution_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE INDEX "product_packages_tenant_id_idx" ON "product_packages"("tenant_id");

-- CreateIndex
CREATE INDEX "security_policies_tenant_id_idx" ON "security_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_flows_tenant_id_idx" ON "approval_flows"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_flows_tenant_id_business_type_key" ON "approval_flows"("tenant_id", "business_type");

-- CreateIndex
CREATE INDEX "approval_nodes_flow_id_idx" ON "approval_nodes"("flow_id");

-- CreateIndex
CREATE INDEX "approval_records_tenant_id_idx" ON "approval_records"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_records_business_type_business_id_idx" ON "approval_records"("business_type", "business_id");

-- CreateIndex
CREATE INDEX "approval_records_approver_id_status_idx" ON "approval_records"("approver_id", "status");

-- CreateIndex
CREATE INDEX "satisfaction_surveys_tenant_id_idx" ON "satisfaction_surveys"("tenant_id");

-- CreateIndex
CREATE INDEX "service_visits_tenant_id_idx" ON "service_visits"("tenant_id");

-- CreateIndex
CREATE INDEX "complaints_tenant_id_idx" ON "complaints"("tenant_id");

-- CreateIndex
CREATE INDEX "referrals_tenant_id_idx" ON "referrals"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_rules_tenant_id_idx" ON "risk_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_records_tenant_id_status_idx" ON "risk_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "risk_notifications_tenant_id_idx" ON "risk_notifications"("tenant_id");

ALTER TABLE "countries" ADD CONSTRAINT "countries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "majors" ADD CONSTRAINT "majors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "majors" ADD CONSTRAINT "majors_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_line_id_fkey" FOREIGN KEY ("business_line_id") REFERENCES "business_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packages" ADD CONSTRAINT "pkg_parent_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packages" ADD CONSTRAINT "pkg_child_fkey" FOREIGN KEY ("child_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_policies" ADD CONSTRAINT "security_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_nodes" ADD CONSTRAINT "approval_nodes_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "approval_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_new_student_id_fkey" FOREIGN KEY ("new_student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_rules" ADD CONSTRAINT "risk_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_records" ADD CONSTRAINT "risk_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_records" ADD CONSTRAINT "risk_records_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "risk_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_records" ADD CONSTRAINT "risk_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_notifications" ADD CONSTRAINT "risk_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_notifications" ADD CONSTRAINT "risk_notifications_risk_record_id_fkey" FOREIGN KEY ("risk_record_id") REFERENCES "risk_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
