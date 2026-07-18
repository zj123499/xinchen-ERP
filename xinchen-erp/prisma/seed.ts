import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 开始播种数据...");

  // 1. 创建租户
  const tenant = await prisma.tenant.upsert({
    where: { slug: "xinchen" },
    update: {},
    create: {
      name: "新辰留学",
      slug: "xinchen",
      status: true,
    },
  });
  console.log("✅ 租户: 新辰留学");

  // 2. 创建角色
  const adminRole = await prisma.role.upsert({
    where: { code: "admin" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "超级管理员",
      code: "admin",
      description: "系统最高权限",
      isSystem: true,
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { code: "sales" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "销售顾问",
      code: "sales",
      description: "负责线索跟进和签约",
      isSystem: true,
    },
  });

  const deliveryRole = await prisma.role.upsert({
    where: { code: "delivery" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "交付顾问",
      code: "delivery",
      description: "负责申请、文书、签证",
      isSystem: true,
    },
  });

  const financeRole = await prisma.role.upsert({
    where: { code: "finance" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "财务",
      code: "finance",
      description: "负责收款、成本、薪资",
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: "manager" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "部门主管",
      code: "manager",
      description: "管理本部门数据",
      isSystem: true,
    },
  });

  console.log("✅ 角色: admin/sales/delivery/finance/manager");

  // 3. 创建菜单
  const menuData = [
    { code: "dashboard", name: "工作台", path: "/", icon: "BarChart3", sort: 1, type: "menu" },
    { code: "sales", name: "销售管理", path: null, icon: "Users", sort: 2, type: "menu" },
    { code: "sales_leads", name: "线索管理", path: "/leads", icon: null, sort: 1, type: "menu", parentCode: "sales" },
    { code: "sales_students", name: "学生档案", path: "/students", icon: null, sort: 2, type: "menu", parentCode: "sales" },
    { code: "sales_followups", name: "跟进记录", path: "/followups", icon: null, sort: 3, type: "menu", parentCode: "sales" },
    { code: "contracts", name: "合同订单", path: null, icon: "FileText", sort: 3, type: "menu" },
    { code: "contracts_list", name: "合同管理", path: "/contracts", icon: null, sort: 1, type: "menu", parentCode: "contracts" },
    { code: "orders_list", name: "订单管理", path: "/orders", icon: null, sort: 2, type: "menu", parentCode: "contracts" },
    { code: "delivery", name: "交付管理", path: null, icon: "ClipboardCheck", sort: 4, type: "menu" },
    { code: "delivery_apps", name: "申请管理", path: "/applications", icon: null, sort: 1, type: "menu", parentCode: "delivery" },
    { code: "delivery_offers", name: "Offer管理", path: "/offers", icon: null, sort: 2, type: "menu", parentCode: "delivery" },
    { code: "delivery_visas", name: "签证管理", path: "/visas", icon: null, sort: 3, type: "menu", parentCode: "delivery" },
    { code: "visits", name: "客户回访", path: "/visits", icon: "PhoneCall", sort: 5, type: "menu" },
    { code: "finance", name: "财务管理", path: null, icon: "DollarSign", sort: 6, type: "menu" },
    { code: "finance_payments", name: "收款管理", path: "/payments", icon: null, sort: 1, type: "menu", parentCode: "finance" },
    { code: "finance_costs", name: "成本管理", path: "/costs", icon: null, sort: 2, type: "menu", parentCode: "finance" },
    { code: "finance_commissions", name: "提成管理", path: "/commissions", icon: null, sort: 3, type: "menu", parentCode: "finance" },
    { code: "finance_salaries", name: "薪资管理", path: "/salaries", icon: null, sort: 4, type: "menu", parentCode: "finance" },
    { code: "finance_reimbursements", name: "报销管理", path: "/reimbursements", icon: null, sort: 5, type: "menu", parentCode: "finance" },
    { code: "extended", name: "扩展业务", path: null, icon: "Home", sort: 7, type: "menu" },
    { code: "extended_rental", name: "租房管理", path: "/rental", icon: null, sort: 1, type: "menu", parentCode: "extended" },
    { code: "extended_overseas", name: "境外服务", path: "/overseas", icon: null, sort: 2, type: "menu", parentCode: "extended" },
    { code: "extended_partners", name: "合作方", path: "/partners", icon: null, sort: 3, type: "menu", parentCode: "extended" },
    { code: "marketing", name: "营销管理", path: null, icon: "Share2", sort: 8, type: "menu" },
    { code: "marketing_sites", name: "站群管理", path: "/sites", icon: null, sort: 1, type: "menu", parentCode: "marketing" },
    { code: "marketing_media", name: "新媒体账号", path: "/media", icon: null, sort: 2, type: "menu", parentCode: "marketing" },
    { code: "settings", name: "系统设置", path: null, icon: "Settings", sort: 99, type: "menu" },
    { code: "settings_org", name: "组织架构", path: "/settings/org", icon: null, sort: 1, type: "menu", parentCode: "settings" },
    { code: "settings_roles", name: "角色权限", path: "/settings/roles", icon: null, sort: 2, type: "menu", parentCode: "settings" },
    { code: "settings_dicts", name: "数据字典", path: "/settings/dicts", icon: null, sort: 3, type: "menu", parentCode: "settings" },
    { code: "settings_configs", name: "系统配置", path: "/settings/configs", icon: null, sort: 4, type: "menu", parentCode: "settings" },
  ];

  const menuMap = new Map<string, number>();

  for (const m of menuData) {
    if (!m.parentCode) {
      const menu = await prisma.menu.upsert({
        where: { code: m.code },
        update: {},
        create: {
          name: m.name,
          code: m.code,
          path: m.path,
          icon: m.icon,
          sort: m.sort,
          type: m.type,
        },
      });
      menuMap.set(m.code, menu.id);
    }
  }

  for (const m of menuData) {
    if (m.parentCode) {
      await prisma.menu.upsert({
        where: { code: m.code },
        update: {},
        create: {
          parentId: menuMap.get(m.parentCode)!,
          name: m.name,
          code: m.code,
          path: m.path,
          icon: m.icon,
          sort: m.sort,
          type: m.type,
        },
      });
    }
  }

  console.log("✅ 菜单: 31 项");

  // 4. 创建权限
  const permData = [
    { code: "leads:create", name: "创建线索", groupName: "线索" },
    { code: "leads:update", name: "编辑线索", groupName: "线索" },
    { code: "leads:delete", name: "删除线索", groupName: "线索" },
    { code: "leads:view", name: "查看线索", groupName: "线索" },
    { code: "leads:export", name: "导出线索", groupName: "线索" },
    { code: "leads:assign", name: "分配线索", groupName: "线索" },
    { code: "students:create", name: "创建学生", groupName: "学生" },
    { code: "students:update", name: "编辑学生", groupName: "学生" },
    { code: "students:delete", name: "删除学生", groupName: "学生" },
    { code: "students:view", name: "查看学生", groupName: "学生" },
    { code: "contracts:create", name: "创建合同", groupName: "合同" },
    { code: "contracts:update", name: "编辑合同", groupName: "合同" },
    { code: "contracts:approve", name: "审批合同", groupName: "合同" },
    { code: "contracts:view", name: "查看合同", groupName: "合同" },
    { code: "payments:create", name: "创建收款", groupName: "财务" },
    { code: "payments:view", name: "查看收款", groupName: "财务" },
    { code: "payments:export", name: "导出财务", groupName: "财务" },
    { code: "applications:create", name: "创建申请", groupName: "交付" },
    { code: "applications:update", name: "编辑申请", groupName: "交付" },
    { code: "applications:view", name: "查看申请", groupName: "交付" },
    { code: "visits:create", name: "创建回访", groupName: "回访" },
    { code: "visits:view", name: "查看回访", groupName: "回访" },
    { code: "settings:manage", name: "系统设置", groupName: "系统" },
    { code: "reports:view", name: "查看报表", groupName: "报表" },
  ];

  const permMap = new Map<string, number>();
  for (const p of permData) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { name: p.name, code: p.code, groupName: p.groupName },
    });
    permMap.set(p.code, perm.id);
  }
  console.log("✅ 权限: 24 项");

  // 5. 角色-菜单关联
  const allMenus = await prisma.menu.findMany();
  for (const menu of allMenus) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: adminRole.id, menuId: menu.id } },
      update: {},
      create: { roleId: adminRole.id, menuId: menu.id },
    });
  }

  const salesMenuCodes = ["dashboard", "sales", "sales_leads", "sales_students", "sales_followups", "contracts", "contracts_list", "orders_list", "visits"];
  for (const code of salesMenuCodes) {
    const menu = await prisma.menu.findUnique({ where: { code } });
    if (menu) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: salesRole.id, menuId: menu.id } },
        update: {},
        create: { roleId: salesRole.id, menuId: menu.id },
      });
    }
  }

  const deliveryMenuCodes = ["dashboard", "delivery", "delivery_apps", "delivery_offers", "delivery_visas", "visits"];
  for (const code of deliveryMenuCodes) {
    const menu = await prisma.menu.findUnique({ where: { code } });
    if (menu) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: deliveryRole.id, menuId: menu.id } },
        update: {},
        create: { roleId: deliveryRole.id, menuId: menu.id },
      });
    }
  }

  const financeMenuCodes = ["dashboard", "finance", "finance_payments", "finance_costs", "finance_commissions", "finance_salaries", "finance_reimbursements"];
  for (const code of financeMenuCodes) {
    const menu = await prisma.menu.findUnique({ where: { code } });
    if (menu) {
      await prisma.roleMenu.upsert({
        where: { roleId_menuId: { roleId: financeRole.id, menuId: menu.id } },
        update: {},
        create: { roleId: financeRole.id, menuId: menu.id },
      });
    }
  }

  console.log("✅ 角色-菜单关联");

  // 6. 角色-权限关联
  for (const [, permId] of permMap) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permId } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permId },
    });
  }

  const salesPerms = ["leads:create", "leads:update", "leads:view", "students:create", "students:update", "students:view", "contracts:create", "contracts:view", "visits:create", "visits:view"];
  for (const code of salesPerms) {
    const pid = permMap.get(code);
    if (pid) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: salesRole.id, permissionId: pid } },
        update: {},
        create: { roleId: salesRole.id, permissionId: pid },
      });
    }
  }

  const deliveryPerms = ["applications:create", "applications:update", "applications:view", "visits:view"];
  for (const code of deliveryPerms) {
    const pid = permMap.get(code);
    if (pid) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: deliveryRole.id, permissionId: pid } },
        update: {},
        create: { roleId: deliveryRole.id, permissionId: pid },
      });
    }
  }

  const financePerms = ["payments:create", "payments:view", "payments:export", "reports:view"];
  for (const code of financePerms) {
    const pid = permMap.get(code);
    if (pid) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: financeRole.id, permissionId: pid } },
        update: {},
        create: { roleId: financeRole.id, permissionId: pid },
      });
    }
  }

  console.log("✅ 角色-权限关联");

  // 7. 创建管理员用户
  const passwordHash = await hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      tenantId: tenant.id,
      username: "admin",
      passwordHash,
      realName: "系统管理员",
      email: "admin@xinchen.com",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log("✅ 管理员用户: admin / admin123");

  // 8. 创建示例用户
  const demoUsers = [
    { username: "sales01", realName: "张顾问", role: salesRole },
    { username: "sales02", realName: "李顾问", role: salesRole },
    { username: "delivery01", realName: "王文书", role: deliveryRole },
    { username: "finance01", realName: "赵会计", role: financeRole },
  ];

  for (const du of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: du.username },
      update: {},
      create: {
        tenantId: tenant.id,
        username: du.username,
        passwordHash,
        realName: du.realName,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: du.role.id } },
      update: {},
      create: { userId: user.id, roleId: du.role.id },
    });
  }

  console.log("✅ 示例用户: sales01/sales02/delivery01/finance01");

  // 9. 创建数据字典
  const dictData = [
    { groupName: "intention_level", items: [{ key: "A", value: "A类-高意向" }, { key: "B", value: "B类-有意向" }, { key: "C", value: "C类-潜在" }, { key: "D", value: "D类-无意向" }] },
    { groupName: "education", items: [{ key: "high_school", value: "高中" }, { key: "bachelor", value: "本科" }, { key: "master", value: "硕士" }, { key: "phd", value: "博士" }] },
    { groupName: "target_country", items: [{ key: "UK", value: "英国" }, { key: "US", value: "美国" }, { key: "AU", value: "澳大利亚" }, { key: "CA", value: "加拿大" }, { key: "SG", value: "新加坡" }, { key: "MY", value: "马来西亚" }] },
    { groupName: "lead_source", items: [{ key: "WALK_IN", value: "上门" }, { key: "REFERRAL", value: "转介绍" }, { key: "MEDIA", value: "新媒体" }, { key: "SEARCH", value: "搜索引擎" }, { key: "PARTNER", value: "合作方" }] },
  ];

  for (const group of dictData) {
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      await prisma.dict.upsert({
        where: { tenantId_groupName_dictKey: { tenantId: tenant.id, groupName: group.groupName, dictKey: item.key } },
        update: {},
        create: {
          tenantId: tenant.id,
          groupName: group.groupName,
          dictKey: item.key,
          dictValue: item.value,
          sort: i,
        },
      });
    }
  }

  console.log("✅ 数据字典: 4 组, 19 项");

  // 10. 创建部门
  const depts = ["总经办", "销售部", "交付部", "财务部", "市场部"];
  for (let i = 0; i < depts.length; i++) {
    await prisma.department.create({
      data: {
        tenantId: tenant.id,
        name: depts[i],
        code: `dept_${i + 1}`,
      },
    });
  }

  console.log("✅ 部门: 5 个");

  // 11. 创建系统配置
  const configs = [
    { key: "company_name", value: { zh: "新辰留学咨询有限公司", en: "Xinchen Education" } },
    { key: "default_currency", value: { code: "CNY", symbol: "¥" } },
    { key: "fiscal_year_start", value: { month: 1, day: 1 } },
    { key: "visit_interval_days", value: { after_sign: 7, application: 14, enrolled: 30 } },
  ];

  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { tenantId_configKey: { tenantId: tenant.id, configKey: c.key } },
      update: {},
      create: {
        tenantId: tenant.id,
        configKey: c.key,
        configValue: c.value,
      },
    });
  }

  console.log("✅ 系统配置: 4 项");

  console.log("\n🎉 种子数据播种完成！");
  console.log("   登录账号: admin / admin123");
  console.log("   其他账号: sales01 / sales02 / delivery01 / finance01");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
