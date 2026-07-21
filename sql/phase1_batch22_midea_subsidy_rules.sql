-- Phase 1 Batch 22: Midea subsidy rules and application checklist.
--
-- Purpose:
-- - Convert the 2026 Midea subsidy application/reimbursement Excel into system rules.
-- - Let marketing campaigns choose a matching subsidy rule.
-- - Let campaign budget items mark whether subsidy application is needed.
-- - Show application/reimbursement checklist and missing-material reminders in V2.
--
-- Review before running live:
-- - Requires Batch 18B helper functions to exist.
-- - This file only adds nullable columns and one new rule table; no existing column is removed.
-- - Run the smoke tests at the bottom after execution, then reload the frontend.

do $$
begin
  if to_regprocedure('public.is_marketing_or_admin()') is null
     or to_regprocedure('public.is_executive()') is null then
    raise exception 'Batch 18B role helper functions are required before running Batch 22';
  end if;
end $$;

create table if not exists public.midea_subsidy_rules (
  id uuid primary key default gen_random_uuid(),
  source_year integer not null default 2026,
  source_file text not null,
  rule_order integer not null,
  activity_type text not null,
  activity_subcategory text,
  activity_purpose text not null,
  accounting_method text,
  coordinating_department text,
  template_type text,
  template_type_en text,
  description text,
  application_materials text,
  verification_documents text,
  max_support_ratio numeric,
  max_support_ratio_note text,
  key_points text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_year, activity_type, activity_subcategory, activity_purpose)
);

create index if not exists idx_midea_subsidy_rules_active_order
  on public.midea_subsidy_rules (is_active, rule_order);

alter table public.marketing_campaigns
  add column if not exists subsidy_rule_id uuid references public.midea_subsidy_rules(id) on delete set null,
  add column if not exists subsidy_rule_notes text;

create index if not exists idx_marketing_campaigns_subsidy_rule
  on public.marketing_campaigns (subsidy_rule_id);

alter table public.marketing_campaign_budget_items
  add column if not exists is_subsidy_applicable boolean not null default false,
  add column if not exists subsidy_rule_id uuid references public.midea_subsidy_rules(id) on delete set null,
  add column if not exists subsidy_application_status text not null default '未申請',
  add column if not exists subsidy_reimbursement_status text not null default '未核銷',
  add column if not exists subsidy_missing_notes text;

create index if not exists idx_campaign_budget_items_subsidy_rule
  on public.marketing_campaign_budget_items (subsidy_rule_id);

create index if not exists idx_campaign_budget_items_subsidy_status
  on public.marketing_campaign_budget_items (is_subsidy_applicable, subsidy_application_status, subsidy_reimbursement_status);

insert into public.midea_subsidy_rules (
  source_year,
  source_file,
  rule_order,
  activity_type,
  activity_subcategory,
  activity_purpose,
  accounting_method,
  coordinating_department,
  template_type,
  template_type_en,
  description,
  application_materials,
  verification_documents,
  max_support_ratio,
  max_support_ratio_note,
  key_points,
  is_active
) values
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 1, $midea$市场推广$midea$, $midea$广告$midea$, $midea$线下广告$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$线下户外广告投放等$midea$, $midea$1.方案介绍/赞助权益
2.费用预算明细表$midea$, $midea$1.总结报告，包括但不限于目标达成情况，优劣势及改进方案等
2.实拍照片（至少4张，且含所有付费项目）
3.第三方合同复印件（10万USD以上需提供）
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7.DN$midea$, 0.5, null, $midea$不建议MBT单独投放$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 2, $midea$市场推广$midea$, $midea$广告$midea$, $midea$媒体运营$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1.在专业媒体、大众媒体、社交媒体、门户网站进行投放（平面、视频广告等）
2.官网、官方社媒建设（建站、维护等）$midea$, $midea$1.方案介绍
2.费用预算明细表$midea$, $midea$1.实拍照片（含每个点位）及点位列表
2.第三方合同复印件
3.第三方发票复印件（金额总计为项目总金额）
4.发票明细表（对应每张发票）
5. 第三方付款记录
6.DN$midea$, 0.5, null, $midea$不建议MBT单独投放$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 3, $midea$市场推广$midea$, $midea$物料设计制作$midea$, $midea$产品营销工具包$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$线下物料：产品及解决方案相关的沙盘、产品机械模型、卖点展示工具等。
线上物料：产品KV，卖点海报(含易拉宝设计), 产品介绍视频, 卖点展示CG动画， 产品卖点解析PPT, 线上虚拟展厅等产品及解决方案营销相关的线上物料。$midea$, $midea$1.方案介绍
2.费用预算明细表$midea$, $midea$1.相关物料验收单(含线上/线下)
2.发票明细表（对应每张发票）
3. 第三方付款记录（如果有）
4.DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 4, $midea$市场推广$midea$, $midea$物料设计制作$midea$, $midea$推广物料$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$日常推广物料的设计、采购等$midea$, $midea$计划采购推广物料明细（含品名、数量、单价、总价、用途、分担比例等基本信息）$midea$, $midea$1.照片/截图
2.发票
3.送货单$midea$, 0.5, null, $midea$不允许采购礼品类报销$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 5, $midea$市场推广$midea$, $midea$品牌推广$midea$, $midea$展会$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$国家端代理商/分公司参加的第三方组织的展会$midea$, $midea$1.项目介绍，包括但不限于展会名称、日期、地点、MBT面积、展台设计方案等
2.费用预算明细表$midea$, $midea$1.展会提供总结报告，包括但不限于目标达成情况，优劣势及改进方案等；
2.实拍照片（至少4张，且含所有付费项目）
3.第三方合同复印件
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7.DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 6, $midea$市场推广$midea$, $midea$品牌推广$midea$, $midea$参观/访厂/旅游$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$代理商/分公司发起的
1.组织顾问/设计师，业主/总包参观样板工程、地区部展厅(圈子营销)
2.组织顾问/设计师，业主/总包回总部参观工厂(圈子营销)
3.按一定规则，奖励目标达成的经销商/分销商进行旅游
4.组织渠道客户(经销商/分销商)回总部参观工厂
5.优先使用MBT 访厂供应商。若不能使用，需要提供说明$midea$, $midea$1.活动方案及行程
2.费用预算明细（需符合海外各类客户会议标准，参考公文【2024】027号）
3. 不支持机票费用$midea$, $midea$1.活动总结报告，包括但不限于目标达成情况，优劣势及改进方案等
2.照片（至少4张，含1张大合影）
3.第三方合同复印件（若由第三方执行需提供）
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7.DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 7, $midea$市场推广$midea$, $midea$品牌推广$midea$, $midea$巡展/路演$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$围绕某产品或者主题在不同城市、地区进行产品/技术/品牌的巡回展示，移动展厅/展车、商场路演活动的制作费、场地费、运营费$midea$, $midea$1. 活动策划方案，包括但不限于日期、地点、行程
2. 费用预算明细表$midea$, $midea$1.活动总结报告，包括但不限于目标达成情况，优劣势及改进方案等
2.实拍照片（至少4张，且含所有付费项目）
3.第三方合同复印件（10万USD以上需提供）
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7. DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 8, $midea$市场推广$midea$, $midea$品牌推广$midea$, $midea$发布会/推介会/渠道会议$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, null, null, $midea$围绕特定产品、渠道、营销节点举办的业务会议$midea$, $midea$1. 会议策划方案，包含但不限于日期、时间、地点、会议形式
2. 会议预算明细，如场地租金、搭建、产品展示、餐饮等$midea$, $midea$1.活动总结报告，包括但不限于目标达成情况，优劣势及改进方案等
2.实拍照片（至少4张，且含所有付费项目）
3.第三方合同复印件（10万USD以上需提供）
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7. DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 9, $midea$市场推广$midea$, $midea$圈子营销$midea$, $midea$圈子活动$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$对象为：顾问，设计师，工程师，安装商，KA，KP业主
内容：聚焦活动对象进行的解决方案及样板工程研讨参观，行业关系维护（如数据中心/商业/酒店/建筑/暖通/电梯等）等系列活动$midea$, $midea$1.活动对象的联系信息：名字，邮箱，所在公司，性别，类别等（申请时可只提交拟邀请对象公司，人数等）
2.活动日程规划，行业关系维护等
3.根据活动日程安排及活动人数预计的活动费用$midea$, $midea$1.活动对象的联系信息：名字，邮箱，所在公司，性别，类别等
2.实际活动日程
3.根据活动日程安排及活动人数实际发生的费用
4.活动报告，包含活动高清照片至少4张，活动总结（包含活动得与失）
5.活动获取得线索（项目信息）
6.第三方合同复印件（10万USD以上需提供）
4.第三方发票复印件（金额总计为项目总金额）
7.发票明细表（对应每张发票）
8. 第三方付款记录
9.DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 10, $midea$市场推广$midea$, $midea$圈子营销$midea$, $midea$项目咨询$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1、前端报告采买、定制化调研报告
2.1上图费（指第三方顾问设计师工程师在工程项目设计时选用美的各品牌相关产品产生的费用，单个项目需500HP/RT及以上）
2.2 品牌白名单（代理或分公司助力美的各品牌进入行业采购白名单所产生的费用，如数据中心/酒店/医疗/教育等）$midea$, $midea$市场报告类：
1.报价单
2. 报告模版样例

项目咨询类：
1.项目名称，产品/方案类别，总装机容量
2.拟进入某个行业白名单，进入路径$midea$, $midea$市场报告类
1.报告
2.第三方合同复印件（10万USD以上需提供）
3.第三方发票复印件（金额总计为项目总金额）
4.发票明细表（对应每张发票）
5. 第三方付款记录

项目咨询类：
1.含美的产品及相关参数的设计图纸，总装机容量
2.第三方付款记录
or 
1.官方白名单名录
2.第三方付款记录$midea$, 0.5, null, $midea$不建议购买对经营贡献低的数据、报告等费用$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 11, $midea$市场推广$midea$, $midea$样板工程$midea$, $midea$CaseStudy$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$在分公司/代理端征集全球范围内优秀OBM工程CaseStudy,从PFABE维度制作CaseStudy宣传内容，包含并不限于高清视频，软文及高清照片$midea$, $midea$1.项目简介（含建筑外观照片，内外机安装照片），装机容量
2.项目意义
3.简要的项目PFABE
4.经总部市场管理部审核遴选通过开始制作$midea$, $midea$1.高清图片*10张，4K,300 dpi
2.120S 视频*1，4K
3.CaseStudy 介绍
包含：项目解决方案的 PFABE
P: 项目痛点
F：美的解决方案的技术特点
A：美的解决方案相较竞品方案的优势：节能/易安装/易维护等
B: 美的解决方案给用户带来的好处
E：顾问/业主针对该项目的观点或第三方认证$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 12, $midea$市场推广$midea$, $midea$样板工程$midea$, $midea$可装修样板工程$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$在全球打造可供长期参观的样板工程。
分公司/代理负责对参观区域内进行装修美化（包括机房、内/外机安装空间、控制室等）及客情关系维护。
分公司/代理端需提供因地制宜的美化方案、项目介绍及项目解说人信息、项目高清图片(300dpi,4K)，总部审核项目资质并跟踪美化效果。$midea$, $midea$1.项目简介，装修前照片
2.项目需符合以下条件之一：
2.1：装机容量 水机>=3台
2.2：项目具有新行业突破、地标、国际赛事等标志性或重大意义
2.3: 项目包含多种产品组合的方案
2.4：装修方案，需考虑整洁度，照明，安全指示，Midea Building Tech. logo的露出等$midea$, $midea$1.装修后高清图片*10张，4K,300 dpi
2.项目简介: 包括装机容量，运行情况，客户满意度等
3.项目解说人bios$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 13, $midea$市场推广$midea$, $midea$终端建设$midea$, $midea$终端建设$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$构建具有美的楼宇科技统一标准的，具有公司实力、品牌介绍、产品及解决方案展示等功能，助力区域内业务拓展的展厅、终端门店（含门头）、体验中心等的设计、施工、多媒体设备、家具等采买。不含展示样机及展示工具。$midea$, $midea$1.网点地址，项目介绍，包括但不限于工期、地点、面积等
2.设计平面图、效果图（至少4个角度，需符合SI）
3.费用预算明细表$midea$, $midea$1.验收报告
2.实拍照片（至少4张，且含所有功能分区）
3.第三方合同复印件
4.第三方发票复印件（金额总计为项目总金额）
5.发票明细表（对应每张发票）
6. 第三方付款记录
7.DN$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 14, $midea$市场推广$midea$, $midea$展示样机$midea$, $midea$展厅/展会样机$midea$, $midea$政策入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$前端展厅/展会，所需陈列展示用的样机，含标准产品及改装产品$midea$, $midea$1.样机申请明细表（含型号/系列、数量、用途、展示期、展后处理方式、责任单位、责任人）
2.项目背景介绍（展厅、展会）$midea$, $midea$1.照片（含每一台）
2.样机签收表（含型号/系列、数量、用途、展示期、展后处理方式、责任单位、责任人、SN码）$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 15, $midea$组织建设$midea$, $midea$专属团队$midea$, $midea$岗位补贴-当年新招$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$26年新招聘人员，不含已支持的专属团队离职补位的情况$midea$, $midea$人员招聘申请表，包含以下内容：
1.岗位名称及汇报对象
2.岗位职责
3.岗位涉及产品线
4.年薪标准
5.支持方案（包含支持年限及支持比例）
6.预计到岗时间$midea$, $midea$一、第一次核销：
1.薪资兑现计算表
2.员工简历
3.劳动合同（需明确薪资和工作年限）
4. DN
二、后续核销：除以上资料外，提供前6个月的在岗证明，如发薪记录或考勤记录等$midea$, 0.5, null, $midea$数据中心人才招聘可特批$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 16, $midea$组织建设$midea$, $midea$专属团队$midea$, $midea$岗位补贴-往年续聘$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$25年已到岗并已开始支持，需继续兑现剩余待支持金额的人员$midea$, $midea$人员招聘申请表，包含以下内容：
1.岗位名称及汇报对象
2.岗位职责
3.岗位涉及产品线
4.年薪标准
5.支持方案（包含支持年限及支持比例）
6.预计到岗时间$midea$, $midea$一、第一次核销：
1.薪资兑现计算表
2.员工简历
3.劳动合同（需明确薪资和工作年限）
4. DN
二、后续核销：除以上资料外，提供前6个月的在岗证明，如发薪记录或考勤记录等$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 17, $midea$组织建设$midea$, $midea$专属团队$midea$, $midea$培训赋能$midea$, $midea$费用入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$前端优秀专属团队，可制作优质培训内容，申报通过总部评审后，可进行试讲和录制，最终用于全海外不同国家专属团队赋能$midea$, $midea$1、讲师基本信息，姓名、年龄、个人简介；
2、课程数量、金额、主题、大纲等；$midea$, $midea$1、课程文件+录制视频；
2、兑现课程数量、金额等；$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 18, $midea$渠道发展$midea$, $midea$渠道拓展$midea$, $midea$新二级渠道拓展$midea$, $midea$政策入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$26年新开拓的二级渠道$midea$, $midea$申请时，备注清楚预计新二级渠道拓展数量、不需要附件$midea$, $midea$新二级渠道备案表，必须明确二级渠道名称、产出证明、产出金额（人民币）等$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 19, $midea$渠道发展$midea$, $midea$渠道拓展$midea$, $midea$二级渠道增长突破$midea$, $midea$政策入账$midea$, $midea$市场营销部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$23/24/25年期间新开的二级渠道（需当时申请过新二级渠道政策支持），26年前端年累计采购金额相比25年实现翻倍$midea$, $midea$本政策仅针对23/24/25年已兑现的二级渠道，申请时需提交当时兑现的备案表$midea$, $midea$二级渠道备案表，必须明确二级渠道名称、25年和26年产出证明、产出金额（人民币）等证明文件$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 20, $midea$技术服务$midea$, $midea$培训体系$midea$, $midea$区域大型培训$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$每场支持≤1.2万RMB/人。$midea$, $midea$培训计划，含培训日期、地址、主题$midea$, $midea$1.培训完成报告（含培训现场照片）
2.费用明细
4.客户实际支付的发票或凭证
3.Debit Note$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 21, $midea$技术服务$midea$, $midea$培训体系$midea$, $midea$渠道培训$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$单场支持≤1000RMB/人。若实际支出低于该限额，则按实际支出金额予以部分或全部支持。$midea$, $midea$培训计划$midea$, $midea$1.培训完成报告（含培训现场照片）
2.费用明细
4.客户实际支付的发票或凭证
3.Debit Note$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 22, $midea$技术服务$midea$, $midea$培训体系$midea$, $midea$培训室建设与升级$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1.培训室建设（含移动培训车）：
S/A级OBM客户+分公司 可100%支持，其它客户支持比例≤50%。
2.培训室的工装样件，可100%支持，包含但不限于电控演示工装箱.透明面板.产品3D模型.零部件解剖件等。$midea$, $midea$1.计划支持内容（新建/升级，支持比例等）
2.培训室地址$midea$, $midea$1.客户与供方签订的合同/合作凭证
2.费用明细
3.客户实际支付的发票或凭证
4.培训室地址、现场照片
5.Debit Note$midea$, 0.5, null, $midea$不支持办公室装修$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 23, $midea$技术服务$midea$, $midea$培训体系$midea$, $midea$培训室样机$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持培训室/培训车的样机，不支持其它费用（如运费、清关费等）$midea$, $midea$1.样机明细（含型号/系列，数量）
2.培训室地址$midea$, $midea$客户签章PI$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 24, $midea$技术服务$midea$, $midea$质保管理$midea$, $midea$OBM质保提升$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持大项目延保，支持比例不超项目金额5%。
支持战略市场延保，支持比例不超合作规模1%。$midea$, $midea$双方确认质保提升邮件$midea$, $midea$1.兑现金额明细
2.和客户签订的质保落地协议
3.Debit Note$midea$, null, $midea$26年暂无预算$midea$, $midea$管理难度大$midea$, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 25, $midea$技术服务$midea$, $midea$质保管理$midea$, $midea$售后口碑提升$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$2018年1月1日出货后的机器，因历史安装调试等非我司产品原因导致市场口碑不良的工程项目，补贴解决方案涉及的费用。$midea$, $midea$申请金额由来$midea$, $midea$1.项目设备清单/故障记录
2.实际解决方案、兑现金额依据
3.Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 26, $midea$技术服务$midea$, $midea$备件及备件仓$midea$, $midea$备件仓建设与升级$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持比例≤50%，单个不超50万RMB$midea$, $midea$计划支持事项
1.和区域备件仓的合作协议
2.备件仓照片
3.支持原因$midea$, $midea$1.支持内容明细
2.备件仓建设升级后照片
3.Debit Note
4.客户实际支付事项的发票或支付凭证$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 27, $midea$技术服务$midea$, $midea$备件及备件仓$midea$, $midea$备件储备支持$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$已通过MBTIB等级认证的备件仓，允许≤50%支持其备件储备；
暂未通过MBTIB等级认证的备件仓，原则上不予支持。$midea$, $midea$申请支持比例$midea$, $midea$客户签章PI$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 28, $midea$技术服务$midea$, $midea$备件及备件仓$midea$, $midea$中心仓激励$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1.对于签约中心仓客户，按合同内容补贴对应金额。
2.牵引客户向区域中心仓采购，总部给予低于发票金额且≤5000欧元的补贴。$midea$, $midea$申请金额由来$midea$, $midea$1.签约中心仓合同
   客户向中心仓采购的交易发票
2.Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 29, $midea$技术服务$midea$, $midea$售后工具及网点$midea$, $midea$售后服务工具$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持比例≤50%。
可用于支持采购基础售后工具（包含但不限于万用表、压力表、真空泵等）和专业的售后工具（包含但不限于端子液压钳、风速计、分贝仪、红外测温仪、热成像仪、卤素检测仪等），提升其专业性和准确性。$midea$, $midea$计划支持内容$midea$, $midea$1.支持内容费用明细
2.实物照片
3.客户实际支付的发票或凭证
4.Debit Note$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 30, $midea$技术服务$midea$, $midea$售后工具及网点$midea$, $midea$售后数据提供$midea$, $midea$政策入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1.客户提供售后数据，包含但不限于安装产品数量、故障记录、维修记录、更换的零部件信息等，每个季度累计可支持客户10,000 RMB。
2.支持客户协助报告验证，单次可激励客户5,000 RMB。$midea$, $midea$计划支持事项$midea$, $midea$1.支持事项完成凭证
2.Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 31, $midea$技术服务$midea$, $midea$售后工具及网点$midea$, $midea$售后服务车辆$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持客户售后服务车辆的采购、租赁和喷漆。
每辆售后服务车的支持金额上限为10万RMB。若实际支出低于该限额，则按实际支出金额予以部分或全部支持。$midea$, $midea$1.计划支持内容（购买/喷漆，数量，金额，支持比例等）
2.预计完成时间$midea$, $midea$1.采购合同
2.车辆费用明细
3.车辆照片
4.Debit Note
5.客户实际支付事项的发票或支付凭证$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 32, $midea$技术服务$midea$, $midea$售后工具及网点$midea$, $midea$ASP服务商$midea$, $midea$费用入账$midea$, $midea$技术服务部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1.支持工单费≤50%；
2.牵引客户新引入ASP，支持客户推动ASP优化门头、补充售后工装等，支持比例≤50%
3.现场技术协助可支持100%$midea$, $midea$1.协议/确认文件
2.ASP名称和计划服务事项$midea$, $midea$1.实际完成的服务事项证明文件
2.Debit Note
3. 客户实际支付的发票或凭证$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 33, $midea$产品政策$midea$, $midea$样机对标$midea$, $midea$样机对标$midea$, $midea$费用入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1. 支持样机费用，不支持其它费用（如运费、清关费等）
2. 本地分析，不运回国内$midea$, $midea$1.partner系统预算申请
2.样机明细（含品牌/系列/型号/数量/金额）
3.样机本地分析计划（含分析地点/分析时间/计划参与人员等）$midea$, $midea$1. 费用明细
2. 客户实际支付的发票或凭证
3. Debit Note
4.实物照片$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 34, $midea$产品政策$midea$, $midea$产品资料$midea$, $midea$本地语言技术资料$midea$, $midea$费用入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1. 产品资料/视频等内容的本地化语言转化
2. 资料提升：支持S/A级别客户自行设计、印制本地化特色的技术资料，单个客户激励不超过100万RMB；$midea$, $midea$1.partner系统预算申请
2.转化需求说明
3.资料提升：提供资料提升计划说明（含资料类型/产品/客户/金额/周期等）$midea$, $midea$1. 完成的产品资料明细
2. 费用明细
3. 实际支付的发票或凭证
4. Debit Note$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 35, $midea$产品政策$midea$, $midea$产品认证$midea$, $midea$当地客牌强制性认证支持$midea$, $midea$费用入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持新品在当地客牌的强制性认证费用$midea$, $midea$1.partner系统预算申请
2.说明支持的理由
3.认证类型
4.预计金额$midea$, $midea$1. 认证证书
2. 费用明细
3. 实际支付的发票或凭证
4. Debit Note$midea$, 0.5, null, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 36, $midea$产品政策$midea$, $midea$产品测评$midea$, $midea$送样测试$midea$, $midea$政策入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$1. 支持样机费
2. 单一型号不超过3台$midea$, $midea$1.partner系统预算申请
2.样机明细（含客户/产品系列/型号/数量/金额）
3.其他费用（运费等）$midea$, $midea$1. 实地安装照片
2. 费用明细
3. 实际支付的发票或凭证
4. Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 37, $midea$产品政策$midea$, $midea$产品测评$midea$, $midea$实地测试$midea$, $midea$政策入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持运费、样机费、安装补贴$midea$, $midea$1.partner系统预算申请
2.样机明细（含客户/产品系列/型号/数量/金额）
3.其他费用（运费、安装补贴等）
4.实地测试计划（含地点/周期等）$midea$, $midea$1. 实地安装照片及测试报告
2. 费用明细
3. 实际支付的发票或凭证
4. Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 38, $midea$产品政策$midea$, $midea$产品测评$midea$, $midea$产品试销$midea$, $midea$政策入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持IOT、磁悬浮、客梯、别墅梯产品试销$midea$, $midea$1.partner系统预算申请
2.样机明细（含客户/产品系列/型号/数量/金额）$midea$, $midea$1.客户二级渠道采购PO
2.销售发票
3. Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true),
  (2026, $midea$26年费用申请&报销详细要求_2026Y Expense Application & Reimbursement Requirements_20260204.xlsx$midea$, 39, $midea$产品政策$midea$, $midea$新品切换$midea$, $midea$新品切换$midea$, $midea$政策入账$midea$, $midea$产品策略部$midea$, $midea$OBM建设$midea$, $midea$OBM Construction$midea$, $midea$支持客户进行新老产品迭代$midea$, $midea$1.partner系统预算申请
2.机器明细（含客户/产品系列/型号/数量/金额）$midea$, $midea$1. 费用明细
2. 实际支付的发票或凭证
3. Debit Note$midea$, null, $midea$26年暂无预算$midea$, null, true)
on conflict (source_year, activity_type, activity_subcategory, activity_purpose) do update set
  source_file = excluded.source_file,
  rule_order = excluded.rule_order,
  accounting_method = excluded.accounting_method,
  coordinating_department = excluded.coordinating_department,
  template_type = excluded.template_type,
  template_type_en = excluded.template_type_en,
  description = excluded.description,
  application_materials = excluded.application_materials,
  verification_documents = excluded.verification_documents,
  max_support_ratio = excluded.max_support_ratio,
  max_support_ratio_note = excluded.max_support_ratio_note,
  key_points = excluded.key_points,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.midea_subsidy_rules enable row level security;

grant select, insert, update on table public.midea_subsidy_rules to authenticated;
revoke delete on table public.midea_subsidy_rules from authenticated;
revoke all privileges on table public.midea_subsidy_rules from anon;
revoke all privileges on table public.midea_subsidy_rules from public;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'midea_subsidy_rules'
  loop
    execute format('drop policy if exists %I on public.midea_subsidy_rules', policy_record.policyname);
  end loop;
end $$;

create policy midea_subsidy_rules_select_authenticated
  on public.midea_subsidy_rules
  for select
  to authenticated
  using (true);

create policy midea_subsidy_rules_insert_marketing_scope
  on public.midea_subsidy_rules
  for insert
  to authenticated
  with check (public.is_marketing_or_admin());

create policy midea_subsidy_rules_update_marketing_scope
  on public.midea_subsidy_rules
  for update
  to authenticated
  using (public.is_marketing_or_admin())
  with check (public.is_marketing_or_admin());

notify pgrst, 'reload schema';

-- Smoke test 1: rule seed count should be 39.
select count(*) as midea_subsidy_rule_count
from public.midea_subsidy_rules
where source_year = 2026;

-- Smoke test 2: newly added fields should all exist.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'marketing_campaigns' and column_name in ('subsidy_rule_id', 'subsidy_rule_notes'))
    or (table_name = 'marketing_campaign_budget_items' and column_name in (
      'is_subsidy_applicable',
      'subsidy_rule_id',
      'subsidy_application_status',
      'subsidy_reimbursement_status',
      'subsidy_missing_notes'
    ))
  )
order by table_name, column_name;

-- Smoke test 3: anon stays blocked, authenticated can read/write but not delete.
select
  has_table_privilege('anon', 'public.midea_subsidy_rules', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.midea_subsidy_rules', 'select') as auth_can_select,
  has_table_privilege('authenticated', 'public.midea_subsidy_rules', 'insert') as auth_can_insert,
  has_table_privilege('authenticated', 'public.midea_subsidy_rules', 'update') as auth_can_update,
  has_table_privilege('authenticated', 'public.midea_subsidy_rules', 'delete') as auth_can_delete;
