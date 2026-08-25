'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];},flag=name=>args.includes(name),context={window:{},console};context.window=context;
for(const file of ['data/research-briefing-config.js','modules/evidence-briefing-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const brief=context.MinshengEvidenceBriefing.create({type:value('--type','COMBINED_RESEARCH_BRIEF'),asOf:value('--as-of','2026-08-23T00:00:00Z'),includeScenarios:flag('--include-scenarios'),includePendingReview:flag('--include-pending-review'),parentBriefingId:value('--since-briefing',null)});
if(!brief.qualityAudit.pass)throw Error(`BRIEFING_QUALITY_FAILED:${brief.qualityAudit.errors.join(',')}`);
const body=context.MinshengEvidenceBriefing.exportBrief(brief,value('--format','json')),output=value('--output',null);
if(output){const target=path.resolve(root,output);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body,'utf8');}
process.stdout.write(body);
