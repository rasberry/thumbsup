const childProcess = require('child_process')
const debug = require('debug')('exiftool-stream')
const es = require('event-stream')
const JSONStream = require('JSONStream')

/*
  Spawn a single <exiftool> process and send all the files to be parsed
  Returns a stream which emits JS objects as they get returned
*/
exports.parse = (rootFolder, filePaths) => {
  const args = [
    '-a', // include duplicate tags
    '-s', // use tag ID, not display name
    '-g', // include group names, as nested structures
    '-c', // specify format for GPS lat/long
    '%+.6f', // lat/long = float values
    '-struct', // preserve XMP structure
    '-json', // JSON output
    '-@', // specify more arguments separately
    '-' // read arguments from standard in
  ]

  // create a new <exiftool> child process
  const child = childProcess.spawn('exiftool', args, {
    cwd: rootFolder,
    stdio: [ 'pipe', 'pipe', 'ignore' ]
  })
  child.on('error', (err) => {
    debug(`Error: please verify that <exiftool> is installed on your system`)
    debug(err.toString())
  })
  child.on('close', (code, signal) => {
    debug(`Exiftool exited with code ${code}`)
  })

  // write all files to <stdin>
  // exiftool will only start processing after <stdin> is closed
  const allFiles = filePaths.join('\n')
  child.stdin.write(allFiles + '\n')
  child.stdin.end()

  // stream <stdout> into a JSON parser
  // parse every top-level object and emit it on the stream
  return es.pipeline(
    child.stdout,
    JSONStream.parse([true])
  )
}