#!/usr/bin/env node}
import dotenv from 'dotenv'
dotenv.config()


import * as logging from './util/logging'
import * as log4js from 'log4js'
import yargs, { ArgumentsCamelCase } from "yargs";
import { explore } from './api/explore'
import { extract } from './api/extract';


const logger = log4js.getLogger()

function end(exitCode: number, error?) {
    if (error != null)
        logger.error(`Ending execution with error: `, error)
    else
        logger.info('Program ended')
    const { exit } = require('yargs')
    log4js.shutdown(() => {
        exit(exitCode)
    })
}

function updateLogLevel(args: any) {
    logging.configure(args['logLevel'])
}

const argParser = yargs.scriptName('crawler').usage('$0 <task> [args]')
argParser.options('logLevel', {
    describe: 'Sets logging level', choices: ['all', 'mark', 'trace', 'debug', 'info', 'error', 'fatal', 'off'], default: 'info'
})


//TODO: Update cli to use positional arguments
argParser.command("explore", "Finds new items to process later",
    { explorer: { describe: "Network key to process", string: true, demandOption: true } }, (argv: ArgumentsCamelCase) => {
        updateLogLevel(argv);
        explore(argv.explorer.toString()).then(() => end(0)).catch(e => end(1, e))
    })


//TODO: Use fetch instead of extract??
argParser.command("extract", "Process all discovered items",
    { network: { describe: "Network key to process", string: true, demandOption: true } }, (argv: ArgumentsCamelCase) => {
        updateLogLevel(argv);
        extract(argv.network.toString()).then(() => end(0)).catch(e => end(1, e))
    })

argParser.demandCommand(1, 1)
argParser.parse()