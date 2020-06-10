#!/usr/bin/env node
'use strict';

const child = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const repl = require('repl');
const util = require('util');

const fetch = require('node-fetch');
const prompts = require('prompts');
const sh = require('shelljs');
const uuid = require('uuid').v4;
const yaml = require('yaml');
const YAML = yaml;

const ext = {
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
      type: 'text',
      name: 'cmd',
      message: process.env.USER+':'+process.cwd().replace('/home/'+process.env.USER,'~')
    });

    let args = response.cmd.split(' ');
    let cmd = args[0];
    args = args.slice(1);
    if (typeof sh[cmd] === 'function') {
      const out = sh[cmd](...args);
      if (out.stdout && cmd !== 'echo') console.log(out.stdout);
    }
    else if (typeof ext[cmd] === 'function') {
      ext[cmd](args);
    }
    else if (cmd) {
      const out = sh.which(cmd);
      if (out && out.stdout && out.stdout.startsWith('/')) {
        try {
          const out = child.execSync(response.cmd).toString();
          if (out) console.log(out);
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
