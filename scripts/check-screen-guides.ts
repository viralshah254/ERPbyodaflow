import fs from "node:fs";
import path from "node:path";
import { ERP_SCREEN_ROUTES, resolveScreenGuide } from "../src/lib/tutorial/screen-guides";
import { DOC_TYPES } from "../src/config/documents";
import { MANUFACTURING_REPORT_IDS } from "../src/lib/api/manufacturing-reports";
import { OPERATIONAL_REPORT_IDS } from "../src/lib/api/operational-reports";
function pages(dir: string): string[] { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?pages(path.join(dir,e.name)):e.name==="page.tsx"?[path.join(dir,e.name)]:[]); }
const base = path.resolve("src/app/(dashboard)");
const routes = pages(base).map(file=>"/"+path.relative(base,path.dirname(file)).replaceAll(path.sep,"/")).filter(route=>!route.startsWith("/dev"));
const missing = routes.filter(route=>!ERP_SCREEN_ROUTES.includes(route));
const obsolete = ERP_SCREEN_ROUTES.filter(route=>!routes.includes(route));
const samples = [...new Set([
 ...routes.map(route=>route.replace("[type]","sales-order").replace("[reportId]","bom-explosion").replaceAll(/\[[^\]]+\]/g,"sample-record")),
 ...DOC_TYPES.flatMap(type=>[`/docs/${type}`,`/docs/${type}/new`,`/docs/${type}/sample-record`,`/docs/${type}/sample-record/edit`]),
 ...MANUFACTURING_REPORT_IDS.map(id=>`/reports/manufacturing/${id}`),
 ...OPERATIONAL_REPORT_IDS.map(id=>`/reports/operations/${id}`),
])];
const screens = samples.map(sample=>{ const guide=resolveScreenGuide(sample); return {sample,route:guide?.route,identity:guide?.identity,title:guide?.title,kind:guide?.kind,tasks:guide?.tasks.length??0,hasSummary:!!guide?.summary,redirect:guide?.redirect}; });
const incomplete=screens.filter(screen=>!screen.hasSummary||screen.tasks<2);
const report = {revision:"erp-handbook-2026-11-04-v4",routeFiles:routes.length,variantSamples:samples.length,missing,obsolete,incomplete,screens};
const output=path.resolve("reports/erp-guide-coverage.json");fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({output,routeFiles:routes.length,variantSamples:samples.length,missing:missing.length,obsolete:obsolete.length,incomplete:incomplete.length}));
if(missing.length||obsolete.length||incomplete.length)process.exitCode=1;
