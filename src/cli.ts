#!/usr/bin/env node}
import dotenv from 'dotenv'
import * as logging from './util/logging'
import * as log4js from 'log4js'
import yargs, { ArgumentsCamelCase } from "yargs";
import { explore } from './api/explore'

dotenv.config()

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


argParser.command("explore", "Finds new items to process later",
    { netKey: { describe: "Network key to process", string: true, demandOption: true } }, (argv: ArgumentsCamelCase) => {
        updateLogLevel(argv);
        explore(argv.netKey.toString()).then(() => end(0)).catch(e => end(1, e))
    })


argParser.demandCommand(1, 1)
argParser.parse()