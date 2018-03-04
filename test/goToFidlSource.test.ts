
// var assert = require('assert');

import 'mocha';
import * as assert from 'assert';

import { findFidlSource } from '../src/findFidlSource';

describe('findFidlSource', function () {
    it("should return null when the input isn't a generated FIDL file", () => {
        assert.equal(null, findFidlSource("/var/log/syslog"));
    });

    it("should return null when the input isn't in the Fuchsia out dir", () => {
        assert.equal(null, findFidlSource("/some/path/file.fidl.dart"));
    });

    it("should support Dart bindings", () => {
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl.dart"));
    });

    it("should support Go bindings", () => {
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/go/src/layer/public/lib/foo/fidl/interface/interface.core.go"));
    });

    it("should support Rust bindings", () => {
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.rs"));
    });

    it("should support C++ bindings", () => {
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl.cc"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl-common.cc"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl-common.h"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl.h"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl-internal.h"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl-sync.cc"));
        assert.equal("/home/user/fuchsia/layer/public/lib/foo/fidl/interface.fidl",
            findFidlSource("/home/user/fuchsia/out/debug-x86-64/gen/layer/public/lib/foo/fidl/interface.fidl-sync.h"));
    });
});
