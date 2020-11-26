#!/bin/sh
haml index.haml build/index.html
sass style.scss build/style.css
tsc script.ts --outFile build/script.js --strict
