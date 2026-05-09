"""End-to-end test: 10 questions per user story, 45 stories, 450 questions total.

Drives the SSE endpoint at http://localhost:3000/api/agent (started by `npm run dev`)
and verifies each question produces:
  - a `done` event
  - a non-empty answer (>= 30 chars, contains digits)
  - a citation block

Stories map to data-dump/USER_STORIES.md (9 datasets × 5 stories each = 45).

Usage:
    # Terminal 1:
    npm run dev

    # Terminal 2 — run all 450:
    python tests/test_user_story_questions.py

    # Smoke test — first 2 questions per story:
    python tests/test_user_story_questions.py --limit 2

    # Single dataset:
    python tests/test_user_story_questions.py --dataset food_inspections

    # Single story bucket:
    python tests/test_user_story_questions.py --story food_inspections_safety_scout

Requires OPENAI_API_KEY (or ANTHROPIC_API_KEY) in the dev server's environment.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request


BASE_URL = os.environ.get("TXLOOKUP_BASE", "http://localhost:3000")
TIMEOUT_S = 90


# ---------------------------------------------------------------------------
# 45 story buckets × 10 questions each = 450 total
# Organized: Dataset → Story (matches data-dump/USER_STORIES.md numbering)
# ---------------------------------------------------------------------------

QUESTIONS: dict[str, list[str]] = {

    # =========================================================================
    # Dataset 1: Food Inspections  (data.austintexas.gov  ecmv-9xxi)
    # =========================================================================

    # Story 1.1 — Restaurant Safety Scout ⭐ RECOMMENDED
    "food_inspections_safety_scout": [
        "Show me restaurants in 78701 with inspection scores below 80 in the last 6 months.",
        "Which restaurants in 78704 have failed food inspections in the past year?",
        "List all Austin restaurants with an inspection score under 70 in the last 3 months.",
        "What restaurants near downtown Austin have the worst recent inspection records?",
        "Show critical food violations flagged at restaurants in 78702 this year.",
        "Which zip codes in Austin have the most restaurants with scores below 75?",
        "Find restaurants on East 6th Street with low inspection scores in the last 6 months.",
        "How many Austin restaurants received failing inspection scores last month?",
        "Which Austin restaurants have scored below 60 in the past 12 months?",
        "Show me the 10 worst-scoring restaurants in Austin from the most recent inspections.",
    ],

    # Story 1.2 — Restaurant Improvement Tracker
    "food_inspections_improvement_tracker": [
        "Show inspection score trends over the past 12 months for restaurants in 78704.",
        "Which Austin restaurants have improved their inspection scores the most in the last year?",
        "Compare inspection scores for restaurants on South Congress Avenue over the past 2 years.",
        "Which Austin restaurants have consistently scored above 95 in the last 4 inspections?",
        "Show me restaurants in 78702 whose scores dropped more than 10 points recently.",
        "Which restaurants in downtown Austin had declining inspection scores in 2025?",
        "Show the score progression for restaurants in 78701 over the last 8 inspections.",
        "Which restaurant categories show the most improvement in Austin inspection scores?",
        "List restaurants in North Austin with score improvements of 15+ points year over year.",
        "What is the average inspection score trend across all Austin restaurants in 2025?",
    ],

    # Story 1.3 — Neighborhood Food Safety Report
    "food_inspections_neighborhood_report": [
        "Which Austin zip code has the highest rate of failed restaurant inspections?",
        "What are the most common food inspection violations in Austin?",
        "Show me the top 5 zip codes with the most food safety violations in the last year.",
        "Which Austin neighborhoods have the highest concentration of low-scoring restaurants?",
        "What percentage of Austin restaurants failed their last food inspection?",
        "Which zip codes have improved food safety the most in the last 2 years?",
        "Show me a breakdown of violation types across Austin zip codes in the past 6 months.",
        "Which Austin neighborhoods have the fewest food safety violations per capita?",
        "What types of violations are most common in 78741 vs 78701?",
        "How many Austin zip codes have an average inspection score below 80?",
    ],

    # Story 1.4 — New Restaurant Trust Builder
    "food_inspections_trust_builder": [
        "What is the latest inspection score for Uchiko restaurant in Austin?",
        "Show me the last 5 inspections for restaurants on West 6th Street.",
        "What is the inspection history for food establishments at 2401 E 6th St Austin?",
        "Which Austin food trucks have passed all their inspections in the last year?",
        "Show me the most recent inspection results for sushi restaurants in Austin.",
        "What is the average number of inspections per Austin restaurant per year?",
        "Which Austin restaurants have a perfect inspection record for the last 3 years?",
        "Show me restaurants in 78703 that passed their last inspection with a score above 90.",
        "What is the inspection status for coffee shops in the Mueller neighborhood?",
        "Show me the latest food safety scores for restaurants in the Domain area Austin.",
    ],

    # Story 1.5 — Serial Violator Alert
    "food_inspections_serial_violator": [
        "Which restaurants have had repeated inspection failures in 78704?",
        "Show me Austin restaurants with 3 or more low-scoring inspections in the last 2 years.",
        "Which food establishments in Austin have the most repeated violations?",
        "List restaurants in Austin that have failed more than 2 inspections in the past year.",
        "Which Austin restaurants have the longest history of food safety violations?",
        "Show me establishments in 78741 with recurring inspection violations.",
        "Which restaurant types in Austin have the most repeat violations?",
        "How many Austin restaurants have failed inspections more than 3 times in 2024-2025?",
        "Show me the top 10 Austin restaurants with the most violation citations overall.",
        "Which Austin zip codes have the most restaurants with repeat inspection failures?",
    ],

    # =========================================================================
    # Dataset 2: Building Permits  (data.austintexas.gov  3syk-w9eu)
    # =========================================================================

    # Story 2.1 — Real Estate Development Heat Map ⭐ RECOMMENDED
    "building_permits_development_heat_map": [
        "Which Austin zip codes have the most building permits issued this year?",
        "Show me the top 5 neighborhoods by new residential permits in Austin.",
        "Which permit types are growing fastest in Austin in 2025?",
        "Where are the hotspots for new construction activity in Austin right now?",
        "How many building permits were issued in 78702 in the last 6 months?",
        "Which zip code had the most new construction starts last quarter?",
        "Show me total permit volume by zip code in Austin for the past 12 months.",
        "Which Austin neighborhoods have seen the biggest increase in permit activity year over year?",
        "How many total building permits has Austin issued in 2025 to date?",
        "Show me the top 10 zip codes by total permit value issued this year.",
    ],

    # Story 2.2 — Permit Timeline Tracker
    "building_permits_timeline_tracker": [
        "What types of construction permits are most common in 78704?",
        "Show me building permits issued in 78703 with their current status.",
        "How many Austin permits are still in pending status after 90 days?",
        "What is the average time from permit issue to completion in Austin?",
        "Show me residential permits in 78745 issued in the last 3 months.",
        "Which Austin zip codes have the most permits still in active status?",
        "How many commercial building permits were issued in Austin in the last 3 months?",
        "Show me the most recently issued building permits in East Austin.",
        "What percentage of Austin building permits from 2024 are still open?",
        "Which permit types take the longest to complete in Austin?",
    ],

    # Story 2.3 — Code Compliance Analyst
    "building_permits_code_compliance": [
        "Show me Austin building permits that have been open for more than 180 days.",
        "Which zip codes have the most stalled or incomplete building permits?",
        "How many Austin permits issued in 2023 are still not closed?",
        "Show me commercial permits in Austin with a status of active for over 12 months.",
        "Which contractor companies have the most incomplete permits in Austin?",
        "How many Austin residential permits are overdue for final inspection?",
        "Show me permits in 78701 with work class of commercial that are still pending.",
        "Which Austin zip codes have the highest ratio of open to closed permits?",
        "How many Austin permits issued before 2024 are still in active status?",
        "Show me the top 10 contractors with the most outstanding open permits in Austin.",
    ],

    # Story 2.4 — Permit Cost Predictor
    "building_permits_cost_predictor": [
        "What is the average job valuation for residential permits in Austin this year?",
        "Compare residential vs commercial permit counts in Austin.",
        "What is the average permit value for new construction in 78702?",
        "Show me the top 10 highest-value permits issued in Austin in 2025.",
        "What is the average total job valuation for roofing permits in Austin?",
        "Which Austin zip codes have the highest average permit values?",
        "Show me the distribution of permit values for electrical permits in Austin.",
        "What is the average permit volume per month in Austin this year?",
        "Which Austin neighborhoods have the highest total construction value in 2025?",
        "Compare permit valuations between 78701 and 78704 in the last 12 months.",
    ],

    # Story 2.5 — Construction Activity by Contractor
    "building_permits_contractor_activity": [
        "Which contractor companies have the most permits issued in Austin this year?",
        "Show me the top 5 Austin contractors by total permit count in 2025.",
        "Which contractors specialize in residential new construction in Austin?",
        "Show me the most active contractors in 78704 over the last 12 months.",
        "Which Austin contractors have the highest total project valuation?",
        "How many different contractors have pulled permits in 78702 this year?",
        "Show me contractors in Austin who have pulled more than 50 permits in 2025.",
        "Which permit types do the top 10 Austin contractors specialize in?",
        "Show me new contractors who have started pulling permits in Austin in 2025.",
        "Which Austin contractors have the most permits for commercial work class?",
    ],

    # =========================================================================
    # Dataset 3: Austin 311 Service Requests  (datahub.austintexas.gov  xwdj-i9he)
    # =========================================================================

    # Story 3.1 — Neighborhood Problem Tracker ⭐ RECOMMENDED
    "service_requests_311_neighborhood_tracker": [
        "What are the top 311 issue types reported in Austin this year?",
        "Which Austin neighborhood has the most 311 complaints?",
        "Show me unresolved 311 service requests in 78704.",
        "How many pothole complaints were filed in Austin in the last 90 days?",
        "What is the most common 311 issue in 78702?",
        "Show me trend of 311 graffiti reports in Austin.",
        "What are the top 10 unresolved 311 issues in Austin right now?",
        "How many streetlight outages were reported in the last month?",
        "Which zip code files the most 311 trash and debris complaints?",
        "Which Austin zip codes have the highest volume of 311 service requests this year?",
    ],

    # Story 3.2 — City Service Efficiency Dashboard
    "service_requests_311_efficiency_dashboard": [
        "Which 311 categories have the longest resolution times in Austin?",
        "Which Austin city department handles the most 311 requests?",
        "Show me 311 requests in Austin that have been open for more than 60 days.",
        "What is the average resolution time for pothole complaints in Austin?",
        "Which Austin departments have the most overdue 311 service requests?",
        "Show me 311 requests closed in the last 30 days by department.",
        "What percentage of Austin 311 requests are resolved within 7 days?",
        "Which types of 311 issues take the longest to resolve in Austin?",
        "Show me 311 service request volume by department in Austin for 2025.",
        "Which Austin zip codes have the longest average 311 resolution times?",
    ],

    # Story 3.3 — Public Infrastructure Report Card
    "service_requests_311_infrastructure_report": [
        "How many total 311 service requests has Austin received in 2025?",
        "Show me the top 5 categories of unresolved 311 issues in Austin.",
        "What is the breakdown of 311 requests by type in Austin this year?",
        "Which infrastructure issue types are most reported in Austin: potholes, streetlights, or graffiti?",
        "Show me year-over-year comparison of 311 volumes in Austin by category.",
        "Which Austin zip codes have seen the biggest increase in 311 complaints in 2025?",
        "How many 311 dead animal removal requests were filed in Austin in the last 30 days?",
        "Show me the distribution of 311 request statuses in Austin right now.",
        "Which months have the highest 311 complaint volume in Austin historically?",
        "How many Austin 311 requests were marked closed in the last 7 days?",
    ],

    # Story 3.4 — Personal Issue Follow-up
    "service_requests_311_personal_followup": [
        "Show me 311 requests filed at addresses in 78741 in the last 2 weeks.",
        "How many 311 requests are currently open in 78745?",
        "Show me 311 animal services requests filed in Austin in the last 7 days.",
        "What is the status of utility complaints filed in 78702 this month?",
        "Show me 311 requests by the Austin Transportation department filed in 78749.",
        "How many 311 complaints were filed in my zip 78704 this week?",
        "Show me all 311 tree-related service requests in East Austin in the last 30 days.",
        "Which 311 requests in 78701 are still open from 2024?",
        "How many 311 noise complaints were filed in Austin in the last 30 days?",
        "Show me 311 requests filed in the St. Johns neighborhood in Austin this year.",
    ],

    # Story 3.5 — Seasonal Pattern Analysis
    "service_requests_311_seasonal_patterns": [
        "Show me how 311 pothole complaints in Austin vary by month.",
        "Which months see the highest volume of 311 graffiti reports in Austin?",
        "Show me seasonal trends in Austin 311 flooding complaints.",
        "How does 311 animal services request volume change through the year in Austin?",
        "Show me 311 yard waste complaints in Austin by month for the past year.",
        "Which season has the highest 311 complaint volume in Austin overall?",
        "Show me Austin 311 streetlight outage reports by month in 2024.",
        "How many 311 AC and heat complaints were filed in Austin during summer 2024?",
        "Show me monthly trend of 311 water quality complaints in Austin.",
        "Which 311 issue types spike in Austin during summer months?",
    ],

    # =========================================================================
    # Dataset 4: Code Violations  (data.austintexas.gov  6wtj-zbtb)
    # =========================================================================

    # Story 4.1 — Property Risk Assessment
    "code_violations_property_risk": [
        "Show me active code violations in 78704 opened in the last year.",
        "How many open code complaints are there in Austin right now?",
        "Which Austin zip codes have the most active code violations?",
        "Show me code complaint cases in 78702 that are currently active.",
        "What types of code violations are most common in Austin?",
        "Show me high-priority code violations in East Austin opened in 2025.",
        "How many active code cases are there in 78741?",
        "Which Austin neighborhoods have the highest rate of code complaints per block?",
        "Show me code violations involving structural issues in Austin in the last 6 months.",
        "Which Austin zip codes have the most high-priority open code cases?",
    ],

    # Story 4.2 — Code Enforcement Priority List
    "code_violations_enforcement_priority": [
        "Show me Austin code violations that have been open for more than 90 days.",
        "Which open code cases in Austin have the highest priority?",
        "How many Austin code violations opened before 2024 are still active?",
        "Show me code complaint cases in 78741 that have been pending for over 6 months.",
        "Which case types have the longest average time to close in Austin?",
        "Show me all active high-priority code cases in 78745.",
        "How many Austin code cases have been open for more than 1 year?",
        "Which Austin departments handle the most code violations?",
        "Show me code violations in 78702 with pending status opened before 2025.",
        "Which zip codes have the oldest unresolved code violation cases in Austin?",
    ],

    # Story 4.3 — Neighborhood Code Health Index
    "code_violations_neighborhood_health": [
        "Show me the top 10 Austin zip codes by number of active code violations.",
        "What percentage of code cases in Austin are currently active vs closed?",
        "Which Austin zip codes have the highest ratio of active to closed code cases?",
        "Show me code violation counts by zip code in Austin for the last 12 months.",
        "Which Austin neighborhoods have the most STR (short-term rental) code complaints?",
        "Show me code complaint volume trends in 78702 over the last 2 years.",
        "Which Austin zip codes have seen the most improvement in code compliance in 2025?",
        "How many code violation cases were opened in Austin in the last 30 days?",
        "Show me the most common case types in 78741 vs 78701.",
        "Which Austin zip codes have the most code cases related to overgrown vegetation?",
    ],

    # Story 4.4 — Landlord Accountability Tracker
    "code_violations_landlord_accountability": [
        "Show me addresses in Austin with multiple active code violations.",
        "Which Austin addresses have had code complaints filed more than 3 times in 2 years?",
        "Show me code cases in 78741 involving property maintenance violations.",
        "Which address in Austin has the most total code complaints on record?",
        "Show me active code cases in 78702 related to substandard housing.",
        "How many Austin addresses have both active and previously closed code cases?",
        "Which types of code violations are most associated with multi-family properties?",
        "Show me code complaint cases in 78741 classified as high priority.",
        "How many Austin addresses have had code violations reopened after being closed?",
        "Show me code cases involving zoning violations in East Austin in 2025.",
    ],

    # Story 4.5 — Code Violation Remediation Guide
    "code_violations_remediation_guide": [
        "What are the most common types of code violations in Austin and how long do they take to close?",
        "Show me recently closed code violation cases in Austin from the last 30 days.",
        "What is the average time to close a code violation case in Austin by type?",
        "Show me code cases closed in 78704 in the past 6 months.",
        "Which case types are most quickly resolved in Austin code enforcement?",
        "How many code violation cases were closed in Austin in 2025 so far?",
        "Show me structural violation cases in Austin that were closed in under 30 days.",
        "What percentage of Austin code cases are resolved without escalation?",
        "Show me code cases in 78702 that moved from active to closed status this year.",
        "What is the typical resolution time for vegetation overgrowth violations in Austin?",
    ],

    # =========================================================================
    # Dataset 5: Crime Reports  (data.austintexas.gov  fdj4-gpfu)
    # =========================================================================

    # Story 5.1 — Neighborhood Safety Profile
    "crime_reports_neighborhood_safety": [
        "What are the most common types of crime in Austin in the last 12 months?",
        "Which Austin zip codes have the most reported crimes in 2025?",
        "Show me crime counts by category in 78704 for the past year.",
        "How many total crimes were reported in Austin in 2024?",
        "Which Austin council districts have the highest crime rates?",
        "Show me the top 10 crime categories in Austin this year.",
        "Which Austin zip code has the lowest reported crime rate?",
        "Show me crime counts by category in 78702 vs 78704 in 2025.",
        "How has overall crime volume in Austin changed from 2023 to 2024?",
        "Which Austin neighborhoods have the most property crimes reported?",
    ],

    # Story 5.2 — Crime Pattern Analysis for Prevention
    "crime_reports_pattern_analysis": [
        "Show me theft crime reports in Austin in the last 90 days.",
        "Which location types in Austin have the most reported crimes?",
        "Show me burglary reports in 78704 in the last 6 months.",
        "Which crime types are most common in East Austin?",
        "Show me family violence incidents in Austin in the last 30 days.",
        "What types of crimes are most commonly reported in Austin parking lots?",
        "Show me robbery reports in downtown Austin in the last 3 months.",
        "Which Austin council district had the most auto theft reports in 2024?",
        "Show me crime reports in 78741 by category for the past year.",
        "How many assault reports were filed in Austin in the last 90 days?",
    ],

    # Story 5.3 — Police Resource Allocation Insight
    "crime_reports_resource_allocation": [
        "How many crimes reported in Austin in 2024 have been cleared by arrest?",
        "What percentage of Austin crime reports have been cleared?",
        "Which crime types in Austin have the lowest clearance rates?",
        "Show me clearance rates by crime category in Austin for 2024.",
        "Which Austin council districts have the most unsolved crimes?",
        "Show me the ratio of cleared to uncleared crimes in 78702 for the last year.",
        "Which crime types in Austin are most likely to be cleared by arrest?",
        "How many Austin crimes reported in 2023 remain uncleared?",
        "Show me family violence crime clearance rates in Austin by year.",
        "Which Austin zip codes have the highest unsolved crime volume in 2025?",
    ],

    # Story 5.4 — Business Owner Risk Mitigation
    "crime_reports_business_risk": [
        "Show me theft and shoplifting reports near commercial areas in Austin in 2025.",
        "Which Austin zip codes have the most theft-related crimes?",
        "How many burglary reports were filed at commercial locations in Austin in 2024?",
        "Show me robbery reports in 78701 in the last 6 months.",
        "Which crime types are most commonly reported at retail locations in Austin?",
        "Show me auto theft reports in 78702 for the past year.",
        "How many vandalism reports were filed in Austin in 2025?",
        "Which Austin neighborhoods have the highest commercial burglary rates?",
        "Show me crime reports at parking lots in downtown Austin in 2025.",
        "How has theft volume changed in Austin between 2023 and 2024?",
    ],

    # Story 5.5 — Cold Case / Clearance Analysis
    "crime_reports_clearance_analysis": [
        "Show me crime reports in Austin from 2023 that remain uncleared.",
        "Which Austin zip codes have the oldest uncleared crime reports?",
        "How many homicide reports in Austin from 2022-2024 are uncleared?",
        "Show me uncleared robbery reports in Austin from 2024.",
        "Which crime categories in Austin have the worst clearance rates historically?",
        "How many total uncleared crime reports does Austin have from 2020-2024?",
        "Show me uncleared assault reports from 78741 in the last 2 years.",
        "Which Austin council districts have the most uncleared violent crime reports?",
        "Show me uncleared family violence reports in Austin from 2024.",
        "What is the clearance rate trend for theft crimes in Austin from 2021 to 2024?",
    ],

    # =========================================================================
    # Dataset 6: Traffic Crashes  (data.austintexas.gov  y2wy-tgr5)
    # =========================================================================

    # Story 6.1 — Dangerous Intersection Identification
    "traffic_crashes_dangerous_intersections": [
        "How many fatal traffic crashes occurred in Austin in 2024?",
        "Which Austin streets have the most traffic fatalities?",
        "Show me fatal crash reports in Austin from the last 12 months.",
        "How many pedestrian fatalities were there in Austin in 2024?",
        "Which Austin street had the most fatal crashes in 2024?",
        "Show me traffic crashes involving fatalities in 78704 in the last 2 years.",
        "How many bicycle fatalities were reported in Austin in 2024?",
        "Which crash types result in the most fatalities in Austin?",
        "Show me fatal crashes on IH 35 in Austin in the last 3 years.",
        "How many Austin traffic crashes in 2024 resulted in a fatality?",
    ],

    # Story 6.2 — Commute Route Safety Planner
    "traffic_crashes_route_safety": [
        "Show me crash reports on South Congress Avenue in Austin in the last year.",
        "How many crashes occurred on MoPac in Austin in 2024?",
        "Show me serious injury crashes in Austin in the last 6 months.",
        "Which Austin roads have the highest total injury counts from crashes?",
        "Show me crashes involving pedestrians in 78702 in the last 12 months.",
        "How many bicycle crashes were reported in Austin in 2024?",
        "Show me crash reports with speed limit above 55 mph in Austin in 2024.",
        "Which Austin zip codes have the most total injury crashes?",
        "Show me crashes at speed limits over 45 mph in Austin in the last year.",
        "How many total injuries resulted from Austin traffic crashes in 2024?",
    ],

    # Story 6.3 — City Infrastructure Accountability
    "traffic_crashes_infrastructure_accountability": [
        "Show me Austin streets with more than 5 crashes in the last 12 months.",
        "Which Austin streets have had repeated serious crashes over the past 3 years?",
        "Show me crash patterns on Lamar Boulevard in Austin for 2023 and 2024.",
        "How many crashes occurred at the same location multiple times in Austin in 2024?",
        "Which Austin road segments have the highest crash density?",
        "Show me crashes on Ben White Blvd in Austin over the last 2 years.",
        "Which Austin streets saw a crash increase from 2023 to 2024?",
        "Show me crashes on Airport Blvd in Austin in the last 12 months.",
        "How many crashes in Austin happened at intersections with speeds over 40 mph?",
        "Show me Austin streets that appear in 10 or more crash reports in 2024.",
    ],

    # Story 6.4 — Insurance Risk Assessment
    "traffic_crashes_insurance_risk": [
        "What is the total number of crashes in Austin for each year from 2021 to 2024?",
        "Show me crash volume by zip code in Austin for 2024.",
        "Which Austin zip codes have the highest crash rates?",
        "What is the ratio of fatal to non-fatal crashes in Austin in 2024?",
        "Show me crashes involving commercial vehicles in Austin in 2024.",
        "How many total injury crashes were there in Austin in 2023 vs 2024?",
        "Which collision types are most common in Austin traffic crashes?",
        "Show me crash counts by speed limit in Austin in 2024.",
        "Which Austin zip codes have the most injury-involving crashes?",
        "What is the trend in Austin traffic fatalities from 2020 to 2024?",
    ],

    # Story 6.5 — Traffic Engineering Case Study
    "traffic_crashes_engineering_analysis": [
        "What collision types are most common in Austin fatal crashes?",
        "Show me Austin crashes involving rear-end collisions in 2024.",
        "How many Austin crashes in 2024 involved a pedestrian death?",
        "Show me head-on collision crashes in Austin in the last 2 years.",
        "Which collision type causes the most injuries in Austin crashes?",
        "Show me crashes in Austin at speed limits of 35 mph or below in 2024.",
        "How many hit-and-run crashes were reported in Austin in 2024?",
        "Show me intersection crashes in Austin in 78704 in the last 12 months.",
        "Which crash types in Austin result in the most severe injuries?",
        "Show me Austin traffic crashes resulting in more than 3 injuries in 2024.",
    ],

    # =========================================================================
    # Dataset 7: Active Businesses  (data.texas.gov  9cir-efmm)
    # =========================================================================

    # Story 7.1 — Market Opportunity Finder
    "active_businesses_market_opportunity": [
        "How many active businesses are registered in Austin Texas?",
        "What are the most common business organization types in Texas?",
        "How many active businesses are registered in Travis County Texas?",
        "Show me the top 10 cities in Texas by number of active businesses.",
        "How many active businesses in Texas are sole proprietors?",
        "Which Texas city has the most active franchise tax permit holders?",
        "Show me active businesses in Austin registered in the last 2 years.",
        "How many active LLC businesses are registered in Austin Texas?",
        "Which Texas counties have the most active businesses per capita?",
        "Show me active businesses in 78702 Austin by organization type.",
    ],

    # Story 7.2 — Competitive Landscape Analysis
    "active_businesses_competitive_landscape": [
        "How many active businesses are registered in Dallas vs Austin Texas?",
        "Show me active businesses in Houston Texas by organization type.",
        "How many corporations are actively registered in Texas?",
        "Which Texas cities have the most active limited partnership businesses?",
        "Show me the breakdown of active businesses in San Antonio by org type.",
        "How does Austin compare to Houston in number of active businesses?",
        "How many active businesses in Texas are classified as associations?",
        "Show me active businesses in Fort Worth vs Austin by count.",
        "Which Texas zip codes have the most active business registrations?",
        "How many active businesses registered in 78701 in Austin Texas?",
    ],

    # Story 7.3 — Vendor and Supplier Discovery
    "active_businesses_vendor_discovery": [
        "Show me active businesses in Austin that started operations in the last year.",
        "List active businesses in Travis County Texas starting with 'Austin'.",
        "Show me active business registrations in Bexar County Texas.",
        "How many active businesses are registered at Austin zip codes 78701-78799?",
        "Show me recently active businesses in Harris County Texas.",
        "How many active businesses in Texas began operations in 2024?",
        "Show me active businesses in Texas registered as limited liability companies.",
        "Which Texas counties had the most new business registrations in 2024?",
        "How many active businesses are registered in El Paso Texas?",
        "Show me active businesses in Tarrant County by organization type.",
    ],

    # Story 7.4 — Economic Development Dashboard
    "active_businesses_economic_development": [
        "How many active businesses are registered in Texas overall?",
        "Show me growth in active Texas business registrations from 2022 to 2024.",
        "Which Texas regions have the most businesses starting per year?",
        "How many active businesses started in Texas in each year from 2020 to 2024?",
        "Which Texas county added the most new businesses in 2024?",
        "Show me active business counts in Texas by major metro area.",
        "How many active businesses in Travis County started in 2023 vs 2024?",
        "Which Texas cities have the fastest-growing number of registered businesses?",
        "Show me active business registrations in Williamson County Texas.",
        "How many new LLCs were registered in Austin in 2024?",
    ],

    # Story 7.5 — Startup Ecosystem Mapper
    "active_businesses_startup_ecosystem": [
        "Show me businesses in Austin Texas that began operations after 2022.",
        "How many new businesses started in Travis County in 2023?",
        "Show me active LLC registrations in Austin that started in 2024.",
        "Which Texas city had the most new business formations in 2023?",
        "Show me businesses registered in Austin's 78704 zip code since 2022.",
        "How many active sole proprietorships started in Texas in 2024?",
        "Which Texas counties have the fastest business registration growth?",
        "Show me new business formations in Travis County month by month for 2024.",
        "How many Austin businesses have been active for less than 2 years?",
        "Which Texas cities have the highest ratio of new to total active businesses?",
    ],

    # =========================================================================
    # Dataset 8: State Expenditures  (data.texas.gov  2zpi-yjjs)
    # =========================================================================

    # Story 8.1 — Government Spending Transparency Report
    "state_expenditures_transparency": [
        "What are the top 10 Texas state agencies by total spending in fiscal year 2024?",
        "How much did Texas spend on education in fiscal year 2024?",
        "What are the largest spending categories in the Texas state budget for 2024?",
        "Show me total Texas state expenditures by major spending category for 2024.",
        "Which Texas agency spent the most in fiscal year 2024?",
        "How much did Texas spend on health and human services in 2024?",
        "Show me the top 5 major spending categories in Texas state budget 2024.",
        "What is the total Texas state spending recorded for fiscal year 2024?",
        "How much did the Texas Department of Transportation spend in 2024?",
        "Show me Texas state spending on public safety in fiscal year 2024.",
    ],

    # Story 8.2 — Contractor Performance Analysis
    "state_expenditures_contractor_analysis": [
        "Which agencies in Texas had the highest expenditures in 2024?",
        "Show me Texas state spending by agency for fiscal year 2024 sorted by amount.",
        "How much did Texas Health and Human Services spend in fiscal year 2024?",
        "Show me the top 5 Texas agencies by spending in 2024.",
        "What did the Texas Comptroller spend in fiscal year 2024?",
        "How much did Texas Department of Criminal Justice spend in 2024?",
        "Show me Texas state education spending by agency in 2024.",
        "Which Texas agencies reduced spending the most from 2023 to 2024?",
        "Show me Texas agency spending for the employee benefits category in 2024.",
        "How much did Texas spend on transportation and infrastructure in fiscal 2024?",
    ],

    # Story 8.3 — Agency Budget Planning
    "state_expenditures_budget_planning": [
        "Show me all major spending categories in Texas state expenditures 2024.",
        "How does Texas spending on education compare to spending on corrections in 2024?",
        "What major spending categories does Texas use to classify expenditures?",
        "Show me Texas state spending on contracts vs employee compensation in 2024.",
        "How much did Texas spend on grants in fiscal year 2024?",
        "Show me Texas agencies with spending above 1 billion dollars in 2024.",
        "Which major spending category accounts for the most Texas state expenditures?",
        "Show me Texas spending breakdown for the Texas Education Agency in 2024.",
        "How much did Texas spend on capital expenditures in fiscal 2024?",
        "Which Texas agency had the largest single spending category amount in 2024?",
    ],

    # Story 8.4 — Economic Impact of State Spending
    "state_expenditures_economic_impact": [
        "What is the total amount spent by all Texas agencies in fiscal year 2024?",
        "Show me the distribution of Texas state spending across major categories in 2024.",
        "How much did Texas spend on public health in fiscal year 2024?",
        "Show me Texas state spending on infrastructure projects in 2024.",
        "How much did Texas state agencies spend in aggregate on employee compensation in 2024?",
        "Show me Texas spending by major category compared to prior years if available.",
        "Which Texas spending category grew the most in 2024?",
        "How much did Texas spend on technology and information services in 2024?",
        "Show me all Texas agencies with expenditures in the social services category 2024.",
        "What is the average spending per Texas state agency in fiscal year 2024?",
    ],

    # Story 8.5 — Fraud Alert / Anomaly Detection
    "state_expenditures_fraud_alert": [
        "Show me Texas agencies with the highest expenditures in a single spending category in 2024.",
        "Which Texas spending categories show the largest year-over-year changes?",
        "Show me Texas agencies that spent more than their historical average in 2024.",
        "Which Texas agencies have unusual concentrations of spending in one category?",
        "Show me Texas state spending categories with amounts over 10 billion in 2024.",
        "How does HHSC spending compare to other large Texas agencies in 2024?",
        "Show me the 5 Texas agencies with the highest per-category spending in 2024.",
        "Which major spending category shows the most concentration of Texas dollars?",
        "Show me all Texas agencies spending over 500 million in a single category in 2024.",
        "What is the ratio of largest to smallest agency spending in Texas fiscal 2024?",
    ],

    # =========================================================================
    # Dataset 9: Mixed Beverage Gross Receipts  (data.texas.gov  naix-2893)
    # =========================================================================

    # Story 9.1 — Local Bar & Restaurant Market Analysis
    "mixed_beverage_market_analysis": [
        "What are the top 10 bars in Austin by total alcohol receipts?",
        "Show me the highest-grossing mixed beverage locations in Austin.",
        "Which Austin establishments have the highest liquor receipts?",
        "Show me total alcohol sales by location in Austin for the most recent reporting period.",
        "Which Austin bars have the highest beer receipts?",
        "Show me the top wine-selling establishments in Austin.",
        "How many mixed beverage permit holders are there in Austin?",
        "Which Austin zip code has the highest total alcohol receipts?",
        "Show me the top 10 Austin establishments by total mixed beverage receipts.",
        "What is the average total receipt per mixed beverage permit holder in Austin?",
    ],

    # Story 9.2 — Tourism Impact on Alcohol Sales
    "mixed_beverage_tourism_impact": [
        "Which Texas cities have the highest total mixed beverage receipts?",
        "Show me total alcohol receipts in Austin vs San Antonio vs Houston.",
        "Which cities in Texas outside Austin have the most alcohol sales?",
        "Show me the top 10 Texas cities by total mixed beverage gross receipts.",
        "How do Austin's total alcohol receipts compare to Dallas?",
        "Which Texas cities have seen the biggest growth in mixed beverage receipts?",
        "Show me total mixed beverage receipts for San Antonio vs Austin.",
        "How many mixed beverage permit holders are active in Texas overall?",
        "Which Texas counties have the highest alcohol sales totals?",
        "Show me total mixed beverage receipts for Houston Texas.",
    ],

    # Story 9.3 — Public Health Monitoring
    "mixed_beverage_public_health": [
        "Show me the highest total receipts mixed beverage locations in Texas.",
        "Which zip codes in Austin have the most mixed beverage permit holders?",
        "Show me total alcohol receipts by reporting period in Austin.",
        "Which Austin neighborhoods have the highest density of alcohol permit holders?",
        "How many mixed beverage permit holders are in Travis County?",
        "Show me Austin establishments with total receipts over 1 million in a single period.",
        "Which Austin zip codes have the most active liquor permit locations?",
        "Show me total beer receipts vs liquor receipts in Austin for the latest period.",
        "How many mixed beverage establishments are active in 78704 Austin?",
        "Which Austin zip code generates the most total alcohol receipts?",
    ],

    # Story 9.4 — Tax Revenue Forecasting
    "mixed_beverage_tax_revenue": [
        "What is the total mixed beverage gross receipts for all of Texas in the latest period?",
        "Show me total alcohol receipts for Texas broken down by reporting period.",
        "What is the total liquor receipt amount across all Texas permit holders?",
        "Show me total wine receipts for Texas in the most recent reporting period.",
        "What is the combined beer plus liquor plus wine receipts for Travis County?",
        "Show me the top 5 Texas counties by total mixed beverage receipts.",
        "How much total alcohol revenue is generated in Harris County Texas?",
        "What is the total mixed beverage receipt amount for Dallas County?",
        "Show me total gross alcohol receipts for Bexar County Texas.",
        "What are the top 3 reporting periods for mixed beverage receipts in Austin?",
    ],

    # Story 9.5 — Small Business Economic Health Index
    "mixed_beverage_business_health": [
        "Show me mixed beverage permit holders in Austin with total receipts under 10000.",
        "How many Austin mixed beverage establishments have receipts below 50000?",
        "Show me small bars in Austin with total receipts between 5000 and 50000.",
        "Which Austin zip codes have the most small mixed beverage businesses?",
        "Show me Austin establishments with zero beer receipts but positive liquor receipts.",
        "How many Austin mixed beverage permit holders have total receipts above 500000?",
        "Show me the distribution of total receipts across Austin mixed beverage locations.",
        "Which Austin zip codes have the healthiest mix of small and large alcohol businesses?",
        "How many Austin bars have cover charge receipts reported?",
        "Show me the range from lowest to highest total receipts for Austin mixed beverage holders.",
    ],
}

# Reverse index: story key → dataset slug (for --dataset filtering)
STORY_TO_DATASET: dict[str, str] = {
    k: k.rsplit("_", maxsplit=k.count("_") - 1)[0]  # strip last segment
    for k in QUESTIONS
}
# Explicit mapping is cleaner
STORY_TO_DATASET = {
    **{k: "food_inspections" for k in QUESTIONS if k.startswith("food_inspections_")},
    **{k: "building_permits" for k in QUESTIONS if k.startswith("building_permits_")},
    **{k: "service_requests_311" for k in QUESTIONS if k.startswith("service_requests_311_")},
    **{k: "code_violations" for k in QUESTIONS if k.startswith("code_violations_")},
    **{k: "crime_reports" for k in QUESTIONS if k.startswith("crime_reports_")},
    **{k: "traffic_crashes" for k in QUESTIONS if k.startswith("traffic_crashes_")},
    **{k: "active_businesses" for k in QUESTIONS if k.startswith("active_businesses_")},
    **{k: "state_expenditures" for k in QUESTIONS if k.startswith("state_expenditures_")},
    **{k: "mixed_beverage" for k in QUESTIONS if k.startswith("mixed_beverage_")},
}

DATASETS = sorted(set(STORY_TO_DATASET.values()))


def parse_sse(stream: bytes) -> list[dict]:
    """Parse an SSE byte stream into a list of event dicts."""
    events: list[dict] = []
    for chunk in stream.split(b"\n\n"):
        chunk = chunk.strip()
        if not chunk or not chunk.startswith(b"data:"):
            continue
        payload = chunk[len(b"data:"):].strip()
        try:
            events.append(json.loads(payload))
        except json.JSONDecodeError:
            continue
    return events


def ask(query: str) -> tuple[bool, str, dict]:
    """POST to /api/agent and consume the SSE stream. Returns (ok, reason, done_event)."""
    body = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/agent",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        return False, f"http {e.code}: {e.read()[:200].decode(errors='replace')}", {}
    except Exception as e:
        return False, f"connection error: {e}", {}

    events = parse_sse(raw)
    if not events:
        return False, "no SSE events parsed", {}

    err = next((e for e in events if e.get("phase") == "error"), None)
    if err:
        return False, f"agent error: {err.get('error', '')[:200]}", err

    done = next((e for e in events if e.get("phase") == "done"), None)
    if not done:
        return False, f"no 'done' event (got {[e.get('phase') for e in events]})", {}

    answer = (done.get("answer") or "").strip()
    citation = done.get("citation")

    if len(answer) < 30:
        return False, f"answer too short ({len(answer)} chars): {answer!r}", done
    if not any(ch.isdigit() for ch in answer):
        return False, "answer contains no digits (no concrete data)", done
    if not citation:
        return False, "no citation in done event", done

    return True, f"ok ({len(answer)} chars, cited)", done


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Run 450 user-story questions (45 stories × 10) through /api/agent"
    )
    ap.add_argument("--limit", type=int, default=0,
                    help="Only run first N questions per story (0 = all 10)")
    ap.add_argument("--story", choices=list(QUESTIONS.keys()), default=None,
                    help="Only run one story bucket")
    ap.add_argument("--dataset", choices=DATASETS, default=None,
                    help="Only run stories for one dataset")
    ap.add_argument("--save", default="tests/results-user-stories.json",
                    help="Where to write detailed results")
    args = ap.parse_args()

    # Quick reachability check.
    try:
        with urllib.request.urlopen(BASE_URL, timeout=5) as r:
            r.read(64)
    except Exception as e:
        print(f"ERROR: cannot reach {BASE_URL} — is `npm run dev` running? ({e})")
        return 2

    # Select which story buckets to run.
    if args.story:
        stories = {args.story: QUESTIONS[args.story]}
    elif args.dataset:
        stories = {k: v for k, v in QUESTIONS.items()
                   if STORY_TO_DATASET.get(k) == args.dataset}
    else:
        stories = QUESTIONS

    results: list[dict] = []
    total = 0
    passed = 0
    t0 = time.time()

    for story, qs in stories.items():
        qs = qs[: args.limit] if args.limit else qs
        dataset = STORY_TO_DATASET.get(story, "unknown")
        print(f"\n=== [{dataset}] {story} ({len(qs)} questions) ===")
        for i, q in enumerate(qs, 1):
            total += 1
            t_start = time.time()
            ok, reason, done = ask(q)
            elapsed = time.time() - t_start
            mark = "PASS" if ok else "FAIL"
            if ok:
                passed += 1
            print(f"  [{mark}] q{i:02d} ({elapsed:5.1f}s) — {q[:70]}")
            if not ok:
                print(f"         └─ {reason}")
            results.append({
                "dataset": dataset,
                "story": story,
                "question_n": i,
                "question": q,
                "ok": ok,
                "reason": reason,
                "elapsed_s": round(elapsed, 2),
                "answer": (done.get("answer") if done else None),
                "citation": (done.get("citation") if done else None),
            })

    dt = time.time() - t0
    print("\n--- Summary ---")
    print(f"Passed: {passed}/{total}  ({100 * passed / max(total, 1):.0f}%)")
    print(f"Total time: {dt:.1f}s ({dt / max(total, 1):.1f}s/question)")

    os.makedirs(os.path.dirname(args.save), exist_ok=True)
    with open(args.save, "w") as f:
        json.dump({"passed": passed, "total": total, "results": results}, f, indent=2)
    print(f"Wrote: {args.save}")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
