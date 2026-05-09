"""Claude-mode harness — all 9 datasets, 10 questions each = 90 queries total.

Hits live Socrata APIs directly. No LLM key required.
Saves one fixture per dataset + combined baseline.

Usage:
    python tests/run_claude_harness.py
    python tests/run_claude_harness.py --dataset food_inspections

Writes: tests/fixtures/<dataset>.json  (one per dataset)
        tests/fixtures/claude-baseline.json  (combined)
"""

from __future__ import annotations
import argparse, base64, json, os, time, urllib.parse, urllib.request
from datetime import datetime, timedelta

SOCRATA_KEY_ID = os.environ.get("SOCRATA_KEY_ID", "")
SOCRATA_KEY_SECRET = os.environ.get("SOCRATA_KEY_SECRET", "")

DATASETS = {
    "food":        {"portal": "data.austintexas.gov",  "id": "ecmv-9xxi"},
    "permits":     {"portal": "data.austintexas.gov",  "id": "3syk-w9eu"},
    "s311":        {"portal": "datahub.austintexas.gov","id": "xwdj-i9he"},
    "code":        {"portal": "data.austintexas.gov",  "id": "6wtj-zbtb"},
    "crime":       {"portal": "data.austintexas.gov",  "id": "fdj4-gpfu"},
    "traffic":     {"portal": "data.austintexas.gov",  "id": "y2wy-tgr5"},
    "businesses":  {"portal": "data.texas.gov",        "id": "9cir-efmm"},
    "expenditures":{"portal": "data.texas.gov",        "id": "2zpi-yjjs"},
    "mixed_bev":   {"portal": "data.texas.gov",        "id": "naix-2893"},
}

def ym(d: int) -> str:
    return (datetime.utcnow() - timedelta(days=d)).strftime("%Y-%m-%dT00:00:00.000")

Y  = "2026-01-01T00:00:00.000"
M6 = ym(180)
M3 = ym(90)
M1 = ym(30)
Y1 = ym(365)

QUERIES: list[dict] = [

    # ═══════════════════════════════════════════════════════════════════
    # 1. FOOD INSPECTIONS  (ecmv-9xxi)
    # Story 1.1  Restaurant Safety Scout
    {"ds":"food","story":"food_inspections","story_n":1,"q":1,"note":"worst-scoring restaurants last 6mo",
     "select":"restaurant_name,score,inspection_date,zip_code","where":f"score<80 AND inspection_date>'{M6}'","order":"score ASC","limit":15},
    {"ds":"food","story":"food_inspections","story_n":1,"q":2,"note":"restaurants by zip with most low scores",
     "select":"zip_code,count(*) AS cnt","where":f"score<80 AND inspection_date>'{M6}'","group":"zip_code","order":"cnt DESC","limit":10},
    {"ds":"food","story":"food_inspections","story_n":1,"q":3,"note":"count of sub-70 scores last year",
     "select":"count(*) AS cnt","where":f"score<70 AND inspection_date>'{Y1}'"},
    {"ds":"food","story":"food_inspections","story_n":1,"q":4,"note":"restaurants on 6th St with low scores",
     "select":"restaurant_name,score,inspection_date,address","where":f"upper(address) LIKE '%6TH%' AND score<85 AND inspection_date>'{M6}'","order":"score ASC","limit":10},
    {"ds":"food","story":"food_inspections","story_n":1,"q":5,"note":"most common inspection type for low-scorers",
     "select":"process_description,count(*) AS cnt","where":f"score<80 AND inspection_date>'{M6}'","group":"process_description","order":"cnt DESC","limit":10},
    # Story 1.2  Restaurant Improvement Tracker
    {"ds":"food","story":"food_inspections","story_n":2,"q":6,"note":"score trend by month last 12mo",
     "select":"date_trunc_ym(inspection_date) AS month,avg(score) AS avg_score,count(*) AS cnt","where":f"inspection_date>'{Y1}'","group":"date_trunc_ym(inspection_date)","order":"month ASC","limit":13},
    {"ds":"food","story":"food_inspections","story_n":2,"q":7,"note":"restaurants with multiple inspections, worst score",
     "select":"restaurant_name,count(*) AS inspections,min(score) AS worst","where":f"inspection_date>'{Y1}'","group":"restaurant_name","order":"worst ASC","limit":10},
    # Story 1.3  Neighborhood Food Safety
    {"ds":"food","story":"food_inspections","story_n":3,"q":8,"note":"avg score by zip last 6mo",
     "select":"zip_code,avg(score) AS avg_score,count(*) AS cnt","where":f"inspection_date>'{M6}'","group":"zip_code","order":"avg_score ASC","limit":10},
    # Story 1.4  New Restaurant Trust Builder
    {"ds":"food","story":"food_inspections","story_n":4,"q":9,"note":"latest inspection per restaurant (top 10 by date)",
     "select":"restaurant_name,score,inspection_date,address","where":f"inspection_date>'{M3}'","order":"inspection_date DESC","limit":10},
    # Story 1.5  Serial Violator Alert
    {"ds":"food","story":"food_inspections","story_n":5,"q":10,"note":"restaurants with repeat failures in 78704",
     "select":"restaurant_name,count(*) AS inspections,min(score) AS worst","where":f"zip_code='78704' AND score<80 AND inspection_date>'{Y1}'","group":"restaurant_name","order":"inspections DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 2. BUILDING PERMITS  (3syk-w9eu)
    # Story 2.1  Development Heat Map
    {"ds":"permits","story":"building_permits","story_n":1,"q":1,"note":"top zip codes by permit count YTD",
     "select":"original_zip,count(*) AS cnt","where":f"issue_date>'{Y}'","group":"original_zip","order":"cnt DESC","limit":10},
    {"ds":"permits","story":"building_permits","story_n":1,"q":2,"note":"monthly permit volume YTD",
     "select":"date_trunc_ym(issue_date) AS month,count(*) AS cnt","where":f"issue_date>'{Y}'","group":"date_trunc_ym(issue_date)","order":"month ASC","limit":13},
    # Story 2.2  Permit Timeline Tracker
    {"ds":"permits","story":"building_permits","story_n":2,"q":3,"note":"permits by status current",
     "select":"status_current,count(*) AS cnt","where":f"issue_date>'{Y}'","group":"status_current","order":"cnt DESC","limit":10},
    {"ds":"permits","story":"building_permits","story_n":2,"q":4,"note":"most common permit types in 78704",
     "select":"permittype,count(*) AS cnt","where":f"original_zip='78704' AND issue_date>'{Y}'","group":"permittype","order":"cnt DESC","limit":10},
    # Story 2.3  Code Compliance
    {"ds":"permits","story":"building_permits","story_n":3,"q":5,"note":"residential vs commercial YTD",
     "select":"permit_class_mapped,count(*) AS cnt","where":f"issue_date>'{Y}'","group":"permit_class_mapped","order":"cnt DESC","limit":10},
    # Story 2.4  Permit Cost
    {"ds":"permits","story":"building_permits","story_n":4,"q":6,"note":"top zip by total job valuation YTD",
     "select":"original_zip,sum(total_job_valuation) AS total_val","where":f"issue_date>'{Y}'","group":"original_zip","order":"total_val DESC","limit":10},
    {"ds":"permits","story":"building_permits","story_n":4,"q":7,"note":"avg job valuation by permit type",
     "select":"permittype,avg(total_job_valuation) AS avg_val,count(*) AS cnt","where":f"issue_date>'{Y}'","group":"permittype","order":"avg_val DESC","limit":10},
    # Story 2.5  Contractor Activity
    {"ds":"permits","story":"building_permits","story_n":5,"q":8,"note":"top contractors by permit count",
     "select":"contractor_company_name,count(*) AS cnt","where":f"issue_date>'{Y}' AND contractor_company_name IS NOT NULL","group":"contractor_company_name","order":"cnt DESC","limit":10},
    {"ds":"permits","story":"building_permits","story_n":5,"q":9,"note":"new construction starts last quarter by zip",
     "select":"original_zip,count(*) AS cnt","where":f"work_class='New' AND issue_date>'{M3}'","group":"original_zip","order":"cnt DESC","limit":10},
    {"ds":"permits","story":"building_permits","story_n":5,"q":10,"note":"commercial permits last 3mo",
     "select":"count(*) AS cnt","where":f"permit_class_mapped='Commercial' AND issue_date>'{M3}'"},

    # ═══════════════════════════════════════════════════════════════════
    # 3. 311 SERVICE REQUESTS  (xwdj-i9he @ datahub.austintexas.gov)
    # Story 3.1  Neighborhood Problem Tracker
    {"ds":"s311","story":"311_service_requests","story_n":1,"q":1,"note":"top issue types YTD",
     "select":"sr_type_desc,count(*) AS cnt","where":f"sr_created_date>'{Y}'","group":"sr_type_desc","order":"cnt DESC","limit":10},
    {"ds":"s311","story":"311_service_requests","story_n":1,"q":2,"note":"zip codes with most complaints YTD",
     "select":"sr_location_zip_code,count(*) AS cnt","where":f"sr_created_date>'{Y}'","group":"sr_location_zip_code","order":"cnt DESC","limit":10},
    # Story 3.2  City Service Efficiency
    {"ds":"s311","story":"311_service_requests","story_n":2,"q":3,"note":"requests by department YTD",
     "select":"sr_department_desc,count(*) AS cnt","where":f"sr_created_date>'{Y}'","group":"sr_department_desc","order":"cnt DESC","limit":10},
    {"ds":"s311","story":"311_service_requests","story_n":2,"q":4,"note":"open vs closed requests YTD",
     "select":"sr_status_desc,count(*) AS cnt","where":f"sr_created_date>'{Y}'","group":"sr_status_desc","order":"cnt DESC","limit":10},
    # Story 3.3  Infrastructure Report Card
    {"ds":"s311","story":"311_service_requests","story_n":3,"q":5,"note":"unresolved requests 78704",
     "select":"sr_type_desc,count(*) AS cnt","where":"sr_location_zip_code='78704' AND sr_status_desc='Open'","group":"sr_type_desc","order":"cnt DESC","limit":10},
    {"ds":"s311","story":"311_service_requests","story_n":3,"q":6,"note":"top 10 oldest open requests",
     "select":"sr_type_desc,sr_created_date,sr_location","where":"sr_status_desc='Open'","order":"sr_created_date ASC","limit":10},
    # Story 3.4  Personal Issue Follow-up
    {"ds":"s311","story":"311_service_requests","story_n":4,"q":7,"note":"pothole complaints last 90 days",
     "select":"count(*) AS cnt","where":f"upper(sr_type_desc) LIKE '%POTHOLE%' AND sr_created_date>'{M3}'"},
    {"ds":"s311","story":"311_service_requests","story_n":4,"q":8,"note":"most common issue in 78702",
     "select":"sr_type_desc,count(*) AS cnt","where":f"sr_location_zip_code='78702' AND sr_created_date>'{Y}'","group":"sr_type_desc","order":"cnt DESC","limit":5},
    # Story 3.5  Seasonal Pattern
    {"ds":"s311","story":"311_service_requests","story_n":5,"q":9,"note":"graffiti reports by month last 12mo",
     "select":"date_trunc_ym(sr_created_date) AS month,count(*) AS cnt","where":f"upper(sr_type_desc) LIKE '%GRAFFITI%' AND sr_created_date>'{Y1}'","group":"date_trunc_ym(sr_created_date)","order":"month ASC","limit":13},
    {"ds":"s311","story":"311_service_requests","story_n":5,"q":10,"note":"trash/debris complaints by zip YTD",
     "select":"sr_location_zip_code,count(*) AS cnt","where":f"(upper(sr_type_desc) LIKE '%TRASH%' OR upper(sr_type_desc) LIKE '%DEBRIS%') AND sr_created_date>'{Y}'","group":"sr_location_zip_code","order":"cnt DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 4. CODE VIOLATIONS  (6wtj-zbtb)
    # Story 4.1  Property Risk Assessment
    {"ds":"code","story":"code_violations","story_n":1,"q":1,"note":"open violations by zip",
     "select":"zip_code,count(*) AS cnt","where":"status='Open'","group":"zip_code","order":"cnt DESC","limit":10},
    {"ds":"code","story":"code_violations","story_n":1,"q":2,"note":"case types for open violations",
     "select":"case_type,count(*) AS cnt","where":"status='Open'","group":"case_type","order":"cnt DESC","limit":10},
    # Story 4.2  Enforcement Priority
    {"ds":"code","story":"code_violations","story_n":2,"q":3,"note":"violations open over 90 days",
     "select":"case_id,case_type,address,opened_date","where":f"status='Open' AND opened_date<'{M3}'","order":"opened_date ASC","limit":15},
    {"ds":"code","story":"code_violations","story_n":2,"q":4,"note":"oldest open violations",
     "select":"case_id,case_type,address,opened_date","where":"status='Open'","order":"opened_date ASC","limit":10},
    # Story 4.3  Neighborhood Code Health
    {"ds":"code","story":"code_violations","story_n":3,"q":5,"note":"violations opened YTD by zip",
     "select":"zip_code,count(*) AS cnt","where":f"opened_date>'{Y}'","group":"zip_code","order":"cnt DESC","limit":10},
    {"ds":"code","story":"code_violations","story_n":3,"q":6,"note":"case types opened YTD",
     "select":"case_type,count(*) AS cnt","where":f"opened_date>'{Y}'","group":"case_type","order":"cnt DESC","limit":10},
    # Story 4.4  Landlord Accountability
    {"ds":"code","story":"code_violations","story_n":4,"q":7,"note":"addresses with most open violations",
     "select":"address,count(*) AS cnt","where":"status='Open'","group":"address","order":"cnt DESC","limit":10},
    {"ds":"code","story":"code_violations","story_n":4,"q":8,"note":"violations by priority level",
     "select":"priority,count(*) AS cnt","where":f"opened_date>'{Y}'","group":"priority","order":"cnt DESC","limit":10},
    # Story 4.5  Remediation Guide
    {"ds":"code","story":"code_violations","story_n":5,"q":9,"note":"closed vs open count YTD",
     "select":"status,count(*) AS cnt","where":f"opened_date>'{Y}'","group":"status","order":"cnt DESC","limit":5},
    {"ds":"code","story":"code_violations","story_n":5,"q":10,"note":"violations by department",
     "select":"department,count(*) AS cnt","where":f"opened_date>'{Y}'","group":"department","order":"cnt DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 5. CRIME REPORTS  (fdj4-gpfu)
    # Story 5.1  Neighborhood Safety Profile
    {"ds":"crime","story":"crime_reports","story_n":1,"q":1,"note":"crime counts by category YTD",
     "select":"ucr_category,count(*) AS cnt","where":f"occ_date>'{Y}'","group":"ucr_category","order":"cnt DESC","limit":10},
    {"ds":"crime","story":"crime_reports","story_n":1,"q":2,"note":"crimes by council district YTD",
     "select":"council_district,count(*) AS cnt","where":f"occ_date>'{Y}'","group":"council_district","order":"cnt DESC","limit":10},
    # Story 5.2  Crime Pattern Analysis
    {"ds":"crime","story":"crime_reports","story_n":2,"q":3,"note":"top crime types last 6mo",
     "select":"crime_type,count(*) AS cnt","where":f"occ_date>'{M6}'","group":"crime_type","order":"cnt DESC","limit":10},
    {"ds":"crime","story":"crime_reports","story_n":2,"q":4,"note":"crimes by location type",
     "select":"location_type,count(*) AS cnt","where":f"occ_date>'{Y}'","group":"location_type","order":"cnt DESC","limit":10},
    # Story 5.3  Police Resource Allocation
    {"ds":"crime","story":"crime_reports","story_n":3,"q":5,"note":"crimes by sector YTD",
     "select":"sector,count(*) AS cnt","where":f"occ_date>'{Y}'","group":"sector","order":"cnt DESC","limit":10},
    {"ds":"crime","story":"crime_reports","story_n":3,"q":6,"note":"monthly crime trend last 12mo",
     "select":"date_trunc_ym(occ_date) AS month,count(*) AS cnt","where":f"occ_date>'{Y1}'","group":"date_trunc_ym(occ_date)","order":"month ASC","limit":13},
    # Story 5.4  Business Owner Risk
    {"ds":"crime","story":"crime_reports","story_n":4,"q":7,"note":"theft/burglary counts by district",
     "select":"council_district,count(*) AS cnt","where":f"(ucr_category='Theft' OR ucr_category='Burglary') AND occ_date>'{Y}'","group":"council_district","order":"cnt DESC","limit":10},
    {"ds":"crime","story":"crime_reports","story_n":4,"q":8,"note":"family violence incidents YTD",
     "select":"count(*) AS cnt","where":f"family_violence='Y' AND occ_date>'{Y}'"},
    # Story 5.5  Clearance / Investigation
    {"ds":"crime","story":"crime_reports","story_n":5,"q":9,"note":"clearance status breakdown YTD",
     "select":"clearance_status,count(*) AS cnt","where":f"occ_date>'{Y}'","group":"clearance_status","order":"cnt DESC","limit":10},
    {"ds":"crime","story":"crime_reports","story_n":5,"q":10,"note":"crimes with no clearance last 6mo",
     "select":"crime_type,count(*) AS cnt","where":f"clearance_status='N' AND occ_date>'{M6}'","group":"crime_type","order":"cnt DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 6. TRAFFIC / CRASH DATA  (y2wy-tgr5)
    # Story 6.1  Dangerous Intersections
    {"ds":"traffic","story":"traffic_fatalities","story_n":1,"q":1,"note":"fatal crashes by street name",
     "select":"rpt_street_name,count(*) AS crashes,sum(death_cnt) AS deaths","where":"crash_fatal_fl='true'","group":"rpt_street_name","order":"deaths DESC","limit":10},
    {"ds":"traffic","story":"traffic_fatalities","story_n":1,"q":2,"note":"total deaths by year",
     "select":"date_trunc_y(crash_timestamp) AS year,sum(death_cnt) AS deaths,count(*) AS crashes","where":"crash_fatal_fl='true'","group":"date_trunc_y(crash_timestamp)","order":"year DESC","limit":5},
    # Story 6.2  Commute Safety Planner
    {"ds":"traffic","story":"traffic_fatalities","story_n":2,"q":3,"note":"pedestrian deaths by street",
     "select":"rpt_street_name,sum(pedestrian_death_count) AS ped_deaths","where":"pedestrian_death_count>0","group":"rpt_street_name","order":"ped_deaths DESC","limit":10},
    {"ds":"traffic","story":"traffic_fatalities","story_n":2,"q":4,"note":"bicycle fatalities by street",
     "select":"rpt_street_name,sum(bicycle_death_count) AS bike_deaths","where":"bicycle_death_count>0","group":"rpt_street_name","order":"bike_deaths DESC","limit":10},
    # Story 6.3  Infrastructure Accountability
    {"ds":"traffic","story":"traffic_fatalities","story_n":3,"q":5,"note":"crashes in construction zones",
     "select":"count(*) AS cnt,sum(death_cnt) AS deaths","where":"road_constr_zone_fl='true'"},
    {"ds":"traffic","story":"traffic_fatalities","story_n":3,"q":6,"note":"crashes by speed limit zone",
     "select":"crash_speed_limit,count(*) AS crashes,sum(death_cnt) AS deaths","where":"crash_speed_limit IS NOT NULL","group":"crash_speed_limit","order":"deaths DESC","limit":10},
    # Story 6.4  Insurance Risk
    {"ds":"traffic","story":"traffic_fatalities","story_n":4,"q":7,"note":"serious injury count by street",
     "select":"rpt_street_name,sum(sus_serious_injry_cnt) AS serious_injuries","where":"sus_serious_injry_cnt>0","group":"rpt_street_name","order":"serious_injuries DESC","limit":10},
    {"ds":"traffic","story":"traffic_fatalities","story_n":4,"q":8,"note":"crashes by collision type",
     "select":"collsn_desc,count(*) AS crashes,sum(death_cnt) AS deaths","where":"collsn_desc IS NOT NULL","group":"collsn_desc","order":"deaths DESC","limit":10},
    # Story 6.5  Traffic Engineering
    {"ds":"traffic","story":"traffic_fatalities","story_n":5,"q":9,"note":"motorcycle fatalities by street",
     "select":"rpt_street_name,sum(motorcycle_death_count) AS moto_deaths","where":"motorcycle_death_count>0","group":"rpt_street_name","order":"moto_deaths DESC","limit":10},
    {"ds":"traffic","story":"traffic_fatalities","story_n":5,"q":10,"note":"total injuries + deaths by crash severity",
     "select":"crash_sev_id,count(*) AS crashes,sum(tot_injry_cnt) AS injuries,sum(death_cnt) AS deaths","where":"crash_sev_id IS NOT NULL","group":"crash_sev_id","order":"deaths DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 7. ACTIVE BUSINESSES  (9cir-efmm @ data.texas.gov)
    # Story 7.1  Market Opportunity Finder
    {"ds":"businesses","story":"active_businesses","story_n":1,"q":1,"note":"business count by city in TX",
     "select":"taxpayer_city,count(*) AS cnt","where":"taxpayer_state='TX'","group":"taxpayer_city","order":"cnt DESC","limit":10},
    {"ds":"businesses","story":"active_businesses","story_n":1,"q":2,"note":"org types distribution",
     "select":"taxpayer_organizational_type,count(*) AS cnt","group":"taxpayer_organizational_type","order":"cnt DESC","limit":10},
    # Story 7.2  Competitive Landscape
    {"ds":"businesses","story":"active_businesses","story_n":2,"q":3,"note":"businesses in Austin by zip",
     "select":"taxpayer_zip,count(*) AS cnt","where":"taxpayer_city='AUSTIN'","group":"taxpayer_zip","order":"cnt DESC","limit":10},
    {"ds":"businesses","story":"active_businesses","story_n":2,"q":4,"note":"record type breakdown",
     "select":"record_type_code,count(*) AS cnt","group":"record_type_code","order":"cnt DESC","limit":10},
    # Story 7.3  Vendor Discovery
    {"ds":"businesses","story":"active_businesses","story_n":3,"q":5,"note":"businesses by county code",
     "select":"taxpayer_county_code,count(*) AS cnt","group":"taxpayer_county_code","order":"cnt DESC","limit":10},
    {"ds":"businesses","story":"active_businesses","story_n":3,"q":6,"note":"Austin businesses with right to transact",
     "select":"right_to_transact_business_code,count(*) AS cnt","where":"taxpayer_city='AUSTIN'","group":"right_to_transact_business_code","order":"cnt DESC","limit":5},
    # Story 7.4  Economic Dashboard
    {"ds":"businesses","story":"active_businesses","story_n":4,"q":7,"note":"new businesses in Austin by responsibility start year",
     "select":"date_trunc_y(responsibility_beginning_date) AS year,count(*) AS cnt","where":"taxpayer_city='AUSTIN'","group":"date_trunc_y(responsibility_beginning_date)","order":"year DESC","limit":5},
    {"ds":"businesses","story":"active_businesses","story_n":4,"q":8,"note":"total active businesses in TX",
     "select":"count(*) AS cnt"},
    # Story 7.5  Startup Ecosystem
    {"ds":"businesses","story":"active_businesses","story_n":5,"q":9,"note":"new Austin businesses since 2024",
     "select":"taxpayer_zip,count(*) AS cnt","where":"taxpayer_city='AUSTIN' AND responsibility_beginning_date>'2024-01-01T00:00:00.000'","group":"taxpayer_zip","order":"cnt DESC","limit":10},
    {"ds":"businesses","story":"active_businesses","story_n":5,"q":10,"note":"org types for new Austin businesses since 2024",
     "select":"taxpayer_organizational_type,count(*) AS cnt","where":"taxpayer_city='AUSTIN' AND responsibility_beginning_date>'2024-01-01T00:00:00.000'","group":"taxpayer_organizational_type","order":"cnt DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 8. STATE EXPENDITURES  (2zpi-yjjs @ data.texas.gov)
    # Story 8.1  Spending Transparency
    {"ds":"expenditures","story":"state_expenditures","story_n":1,"q":1,"note":"spending by agency 2024",
     "select":"agency_name,sum(amount) AS total","where":"fiscal_year='2024'","group":"agency_name","order":"total DESC","limit":10},
    {"ds":"expenditures","story":"state_expenditures","story_n":1,"q":2,"note":"spending by category 2024",
     "select":"major_spending_category,sum(amount) AS total","where":"fiscal_year='2024'","group":"major_spending_category","order":"total DESC","limit":10},
    # Story 8.2  Contractor Analysis
    {"ds":"expenditures","story":"state_expenditures","story_n":2,"q":3,"note":"total expenditure 2024",
     "select":"sum(amount) AS total","where":"fiscal_year='2024'"},
    {"ds":"expenditures","story":"state_expenditures","story_n":2,"q":4,"note":"spending trend by fiscal year",
     "select":"fiscal_year,sum(amount) AS total","group":"fiscal_year","order":"fiscal_year DESC","limit":5},
    # Story 8.3  Agency Budget Planning
    {"ds":"expenditures","story":"state_expenditures","story_n":3,"q":5,"note":"top 5 agencies by spend all years",
     "select":"agency_name,sum(amount) AS total","group":"agency_name","order":"total DESC","limit":5},
    {"ds":"expenditures","story":"state_expenditures","story_n":3,"q":6,"note":"spending category breakdown all years",
     "select":"major_spending_category,count(*) AS records,sum(amount) AS total","group":"major_spending_category","order":"total DESC","limit":10},
    # Story 8.4  Economic Impact
    {"ds":"expenditures","story":"state_expenditures","story_n":4,"q":7,"note":"avg spending per agency 2024",
     "select":"avg(amount) AS avg_amount","where":"fiscal_year='2024'"},
    {"ds":"expenditures","story":"state_expenditures","story_n":4,"q":8,"note":"YoY spend comparison top agencies",
     "select":"agency_name,fiscal_year,sum(amount) AS total","where":"fiscal_year IN('2023','2024')","group":"agency_name,fiscal_year","order":"total DESC","limit":20},
    # Story 8.5  Fraud Alert
    {"ds":"expenditures","story":"state_expenditures","story_n":5,"q":9,"note":"agencies with highest single-year spend spike",
     "select":"agency_name,fiscal_year,sum(amount) AS total","group":"agency_name,fiscal_year","order":"total DESC","limit":10},
    {"ds":"expenditures","story":"state_expenditures","story_n":5,"q":10,"note":"count of spending records by category",
     "select":"major_spending_category,count(*) AS cnt","group":"major_spending_category","order":"cnt DESC","limit":10},

    # ═══════════════════════════════════════════════════════════════════
    # 9. MIXED BEVERAGE RECEIPTS  (naix-2893 @ data.texas.gov)
    # Story 9.1  Bar & Restaurant Market Analysis
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":1,"q":1,"note":"top Austin bars by total receipts",
     "select":"location_name,total_receipts,obligation_end_date_yyyymmdd","where":"taxpayer_city='AUSTIN'","order":"total_receipts DESC","limit":10},
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":1,"q":2,"note":"total receipts by city in TX",
     "select":"taxpayer_city,sum(total_receipts) AS total","where":"taxpayer_state='TX'","group":"taxpayer_city","order":"total DESC","limit":10},
    # Story 9.2  Tourism Impact
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":2,"q":3,"note":"Austin receipts by obligation period (trend)",
     "select":"date_trunc_ym(obligation_end_date_yyyymmdd) AS period,sum(total_receipts) AS total","where":"taxpayer_city='AUSTIN'","group":"date_trunc_ym(obligation_end_date_yyyymmdd)","order":"period DESC","limit":13},
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":2,"q":4,"note":"Austin downtown zip receipts",
     "select":"location_zip,sum(total_receipts) AS total","where":"taxpayer_city='AUSTIN'","group":"location_zip","order":"total DESC","limit":10},
    # Story 9.3  Public Health
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":3,"q":5,"note":"beer vs wine vs liquor receipts in Austin",
     "select":"sum(liquor_receipts) AS liquor,sum(wine_receipts) AS wine,sum(beer_receipts) AS beer","where":"taxpayer_city='AUSTIN'"},
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":3,"q":6,"note":"locations with highest beer receipts Austin",
     "select":"location_name,beer_receipts","where":"taxpayer_city='AUSTIN'","order":"beer_receipts DESC","limit":10},
    # Story 9.4  Tax Revenue Forecasting
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":4,"q":7,"note":"statewide total receipts by period",
     "select":"date_trunc_ym(obligation_end_date_yyyymmdd) AS period,sum(total_receipts) AS total","group":"date_trunc_ym(obligation_end_date_yyyymmdd)","order":"period DESC","limit":13},
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":4,"q":8,"note":"total receipts by county",
     "select":"taxpayer_county,sum(total_receipts) AS total","where":"taxpayer_state='TX'","group":"taxpayer_county","order":"total DESC","limit":10},
    # Story 9.5  Small Business Health Index
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":5,"q":9,"note":"count of active permit holders in Austin",
     "select":"count(*) AS cnt","where":"taxpayer_city='AUSTIN'"},
    {"ds":"mixed_bev","story":"mixed_beverage","story_n":5,"q":10,"note":"cover charge receipts top Austin venues",
     "select":"location_name,cover_charge_receipts","where":"taxpayer_city='AUSTIN' AND cover_charge_receipts>0","order":"cover_charge_receipts DESC","limit":10},
]


def socrata_fetch(ds_key: str, select: str, where: str = "",
                  group: str = "", order: str = "", limit: int = 100) -> dict:
    ds = DATASETS[ds_key]
    params: dict[str, str] = {"$select": select, "$limit": str(limit)}
    if where:  params["$where"] = where
    if group:  params["$group"] = group
    if order:  params["$order"] = order
    url = f"https://{ds['portal']}/resource/{ds['id']}.json?" + urllib.parse.urlencode(params)
    headers = {"Accept": "application/json"}
    if SOCRATA_KEY_ID and SOCRATA_KEY_SECRET:
        token = base64.b64encode(
            f"{SOCRATA_KEY_ID}:{SOCRATA_KEY_SECRET}".encode("utf-8")
        ).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=25) as r:
            data = json.loads(r.read())
        if isinstance(data, list):
            return {"ok": True, "rows": data, "url": url}
        return {"ok": False, "error": str(data)[:300], "url": url}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300], "url": url}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=None, help="Run only one story bucket")
    args = ap.parse_args()

    queries = [q for q in QUERIES if not args.dataset or q["story"] == args.dataset]

    out_dir = os.path.join(os.path.dirname(__file__), "fixtures")
    os.makedirs(out_dir, exist_ok=True)

    all_results: list[dict] = []
    dataset_results: dict[str, list] = {}

    print(f"\nRunning {len(queries)} queries across {len({q['story'] for q in queries})} datasets...\n")

    for entry in queries:
        label = f"{entry['story']} s{entry['story_n']}q{entry['q']:02d}"
        t0 = time.time()
        res = socrata_fetch(entry["ds"], entry["select"],
                            where=entry.get("where",""), group=entry.get("group",""),
                            order=entry.get("order",""), limit=entry.get("limit",100))
        elapsed = round(time.time() - t0, 2)
        ok = res["ok"] and len(res.get("rows", [])) > 0
        status = "PASS" if ok else ("EMPTY" if res["ok"] else "FAIL")

        print(f"  [{status}] {label} ({elapsed}s) — {entry['note']}")
        if not res["ok"]:
            print(f"         └─ {res['error'][:120]}")
        elif not res.get("rows"):
            print(f"         └─ 0 rows")
        else:
            print(f"         └─ {len(res['rows'])} rows: {json.dumps(res['rows'][:1], default=str)[:140]}")

        record = {**entry, "status": status, "elapsed_s": elapsed,
                  "row_count": len(res.get("rows",[])),
                  "rows": res.get("rows",[]), "error": res.get("error"),
                  "url": res.get("url")}
        all_results.append(record)
        dataset_results.setdefault(entry["story"], []).append(record)

    # ── per-dataset fixtures ─────────────────────────────────────────────────
    for story, recs in dataset_results.items():
        path = os.path.join(out_dir, f"{story}.json")
        with open(path, "w") as f:
            passed = sum(1 for r in recs if r["status"] == "PASS")
            json.dump({"dataset": story, "generated": datetime.utcnow().isoformat(),
                       "passed": passed, "total": len(recs), "results": recs}, f, indent=2, default=str)

    # ── combined baseline ────────────────────────────────────────────────────
    with open(os.path.join(out_dir, "claude-baseline.json"), "w") as f:
        json.dump({"generated": datetime.utcnow().isoformat(), "results": all_results}, f, indent=2, default=str)

    # ── summary ─────────────────────────────────────────────────────────────
    print("\n=== Summary ===")
    grand_pass = grand_total = 0
    for story, recs in dataset_results.items():
        p = sum(1 for r in recs if r["status"] == "PASS")
        e = sum(1 for r in recs if r["status"] == "EMPTY")
        f = sum(1 for r in recs if r["status"] == "FAIL")
        grand_pass += p; grand_total += len(recs)
        print(f"  {story}: {p}/{len(recs)} PASS  {e} EMPTY  {f} FAIL")
    print(f"\n  Grand total: {grand_pass}/{grand_total}")
    print(f"\nFixtures written to {out_dir}/")


if __name__ == "__main__":
    main()
