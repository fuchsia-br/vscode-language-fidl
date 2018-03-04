// TODO: establish a non-regex way of finding the source FIDL path.

// These regular expressions match FIDL generated binding source files in the
// Fuchsia tree. They all capture three groups:
// 1. The path to the root of the Fuchsia tree
// 2. The path within the Fuchsia tree of the directory containing the FIDL
// 3. The name of the FIDL source file, without ".fidl"
const cxx_dart_re = /(^.+)\/(?:out\/[^/]+\/gen\/)(.+)\/([^\/]+)\.fidl[\._-][^/]*$/;
const go_re = /(^.+)\/(?:out\/[^/]+\/gen\/go\/src\/)(.+)\/([^/]+)\/\3\.core\.go$/;
const rust_re = /(^.+)\/(?:out\/[^/]+\/gen\/)(.+)\/([^/]+)\.rs$/;

export function findFidlSource(generatedSourcePath: string): string | void {
    const match = generatedSourcePath.match(cxx_dart_re)
        || generatedSourcePath.match(go_re)
        || generatedSourcePath.match(rust_re);
    if (match) {
        return `${match[1]}/${match[2]}/${match[3]}.fidl`;
    }
}
