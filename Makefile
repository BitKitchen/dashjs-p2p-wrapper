.PHONY: build clean lintfix

DASHJS_SRC_FILES = $(shell find node_modules/dashjs -type f -name "*.js")

LIB_FILES = $(shell find lib -type f -name "*.js")

DIST_WRAPPER = dist/wrapper/dashjs-p2p-wrapper.js
DIST_BUNDLE = dist/bundle/dashjs-p2p-bundle.js

NODE_BIN = ./node_modules/.bin

# default target "all"
build: $(DIST_WRAPPER) $(DIST_BUNDLE)

lintfix:
	$(NODE_BIN)/eslint --fix lib/ test/

clean:
	rm -Rf dashjs
	rm -Rf dist

dashjs: $(DASHJS_SRC_FILES)
	$(NODE_BIN)/babel ./node_modules/dashjs/externals --out-dir dashjs/externals
	$(NODE_BIN)/babel ./node_modules/dashjs/src --out-dir dashjs/src
	$(NODE_BIN)/babel ./node_modules/dashjs/index.js --out-file dashjs/all.js

$(DIST_BUNDLE): $(LIB_FILES) dashjs
	mkdir -p dist
	mkdir -p dist/bundle
	$(NODE_BIN)/browserify --debug -p browserify-derequire -t [babelify] -s DashjsP2PBundle lib/DashjsMediaPlayerBundle.js | $(NODE_BIN)/exorcist $(DIST_BUNDLE).map -b . > $(DIST_BUNDLE)

$(DIST_WRAPPER): $(LIB_FILES) dashjs
	mkdir -p dist
	mkdir -p dist/wrapper
	$(NODE_BIN)/browserify --debug -p browserify-derequire -t [babelify] -s DashjsWrapper lib/DashjsWrapper.js | $(NODE_BIN)/exorcist $(DIST_WRAPPER).map -b . > $(DIST_WRAPPER)

