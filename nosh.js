#!/usr/bin/env node
'use strict';

const child = require('child_process');
const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const http = require('http');
const repl = require('repl');
const util = require('util');

const fetch = require('node-fetch');
const git = require('isomorphic-git');
const open = require('open');
const prompts = require('prompts');
const sh = require('shelljs');
const uuid = require('uuid').v4;
const yaml = require('yaml');
const YAML = yaml;

const pj = require('./package.json');

let ptype = 'text';

// consider moving to official shelljs plugin method
// https://github.com/shelljs/shelljs/wiki/Derivative-works-and-related-projects#plugins

const ext = {
  clear: function() { console.clear(); },
  reset: function() { console.clear(); },
  version: function() { console.log(pj.version) },
  date: function() { console.log(new Date().toLocaleString((process.env.LANG || 'en-GB').split('.')[0].replace('_','-'))); },
  open: async function(args) { await open(args[0]); },
  run: function(args) {
    const s = fs.readFileSync(args[0],'utf8');
    console.log(eval(s));
  },
  nslookup: async function(args) {
    console.log(await dns.lookup(args[0]));
  },
  dig: async function(args) {
    console.log(await dns.resolveAny(args[0]));
  },
  report: function() {
    if (process.report) {
      console.log(process.report.getReport());
    }
    else {
      console.warn('Unsupported in this node version');
    }
  },
  secret: function(args) {
    if (!args[0] || args[0] === 'on') {
      ptype = 'password';
    }
    else {
      ptype = 'text';
    }
  },
  timer: function(args) {
    if (!args[0] || args[0] === 'on') {
      console.time();
    }
    else {
      console.timeEnd();
    }
  },
  g: async function(args) {
    const func = args[0];
    if (typeof git[func] === 'function') {
      try {
        console.log(await git[func]({ filepath:'.', dir:'.',fs:fs, http:http }));
      }
      catch (ex) { console.warn(ex.message) }
    }
    else {
      const cmds = Object.keys(git).sort().filter(function(e,i,a){
        return (typeof git[e] === 'function');
      });
      console.table(cmds);
    }
  },
  repl: function() { repl.start(); },
  uuid: function() { console.log(uuid()) },
  table: function(args) {
    try {
      const s = fs.readFileSync(args[0],'utf8');
      const o = JSON.parse(s);
      console.table(o);
    }
    catch (ex) {
      console.warn(ex.message);
    }
  }, 
  jcat: function(args) {
    try {
      const s = fs.readFileSync(args[0],'utf8');
      const o = JSON.parse(s);
      console.log(util.inspect(o,{depth:null,colors:true}));
    }
    catch (ex) {
      console.warn(ex.message);
    }
  },
  help: function(args){
    const cmds = Object.keys(sh).concat(Object.keys(ext));
    cmds.sort().filter(function(e,i,a){
      return (typeof sh[e] === 'function');
    });
    console.table(cmds);
  },
  fetch: async function(args){
    try {
      const response = await fetch(args[0]);
      const result = await response.text();
      console.log(result);
    }
    catch (ex) {
      console.error(ex.message);
    }
  }
};

async function main() {
  while (true) {

    const response = await prompts({
      type: ptype,
      name: 'cmd',
      message: process.env.USER+':'+process.cwd().replace('/home/'+process.env.USER,'~')
    });

    let args = response.cmd.split(' ');
    let cmd = args[0];
    args = args.slice(1);
    if (typeof sh[cmd] === 'function') {
      const out = sh[cmd](...args);
      if (out && out.stdout && cmd !== 'echo') console.log(out.stdout);
    }
    else if (typeof ext[cmd] === 'function') {
      await ext[cmd](args);
    }
    else if (cmd) {
      const out = sh.which(cmd);
      if (out && out.stdout && out.stdout.startsWith('/')) {
        try {
          const args = response.cmd.split(' ');
          const cmd = args.shift();
          child.spawnSync(cmd,args,{stdio:'inherit'},function(err,out) {
            if (err) console.warn(err);
            if (out) console.log(out);
          });
        }
        catch (ex) {
          //console.error(ex.message);
        }
      }
      else {
        try {
          console.log(eval(response.cmd));
        }
        catch (ex) {
          console.error(ex.message);
        }
      }
    }
  }
}

main();
