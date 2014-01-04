/*!
 * Copyright by Oleg Efimov
 * and other node-pinba contributors
 *
 * See contributors list in README
 *
 * See license text in LICENSE file
 */

/*global describe, it*/

var assert = require("assert");

var _ = require('lodash');

var sinon = require("sinon");

var Pinba = require('../');

describe('pinba', function () {
  var constants = [
    'FLUSH_ONLY_STOPPED_TIMERS',
    'FLUSH_RESET_DATA',
    'ONLY_STOPPED_TIMERS'
  ];
  _.forEach(constants, function (constant) {
    it('should export ' + constant + ' constant', function () {
      assert.ok(constant in Pinba);
    });
  });

  it('should export Request class', function () {
    assert.ok(typeof Pinba.Request === 'function');
  });

  describe('Request', function () {
    describe('methods', function () {
      var methods = [
        'setHostname',
        'setServerName',
        'setScriptName',
        'setSchema',
        'setPinbaServer',
        'setPinbaPort',
        'tagSet',
        'tagGet',
        'tagDelete',
        'tagsGet',
        'timerStart',
        'timerStop',
        'timerAdd',
        'timerDelete',
        'timerTagsMerge',
        'timerTagsReplace',
        'timerDataMerge',
        'timerDataReplace',
        'timerGetInfo',
        'timersStop',
        'timersGet',
        'getInfo',
        'getGPBMessageData',
        'flush'
      ];
      _.forEach(methods, function (method) {
        var r = new Pinba.Request();
        it('should have method ' + method + '()', function () {
          assert.ok(typeof r[method] === 'function');
        });
      });
    });

    describe('settings', function () {
      it('should support parameters', function () {
        var r = new Pinba.Request({
          hostname:     'HOSTNAME',
          server_name:  'SERVER_NAME',
          script_name:  'SCRIPT_NAME',
          schema:       'SCHEMA',
          pinba_server: 'PINBA_SERVER',
          pinba_port:   'PINBA_PORT'
        });

        assert.deepEqual(
          [
            r.hostname,
            r.server_name,
            r.script_name,
            r.schema,
            r.pinba_server,
            r.pinba_port
          ],
          [
            'HOSTNAME',
            'SERVER_NAME',
            'SCRIPT_NAME',
            'SCHEMA',
            'PINBA_SERVER',
            'PINBA_PORT'
          ]
        );
      });

      it('that may be changed through setters', function () {
        var r = new Pinba.Request();

        r.setHostname('HOSTNAME');
        r.setServerName('SERVER_NAME');
        r.setScriptName('SCRIPT_NAME');
        r.setSchema('SCHEMA');
        r.setPinbaServer('PINBA_SERVER');
        r.setPinbaPort('PINBA_PORT');

        assert.deepEqual(
          [
            r.hostname,
            r.server_name,
            r.script_name,
            r.schema,
            r.pinba_server,
            r.pinba_port
          ],
          [
            'HOSTNAME',
            'SERVER_NAME',
            'SCRIPT_NAME',
            'SCHEMA',
            'PINBA_SERVER',
            'PINBA_PORT'
          ]
        );
      });
    });

    describe('tags', function () {
      it('should by properly generated [tagSet+tagGet]', function () {
        var r = new Pinba.Request();

        r.tagSet('tag1', 'value');

        assert.equal(r.tagGet('tag1'), 'value', "Right tag value");
      });

      it('may be replaced [tagSet+tagSet+tagGet]', function () {
        var r = new Pinba.Request();

        r.tagSet('tag1', 'value1');
        r.tagSet('tag1', 'value2');

        assert.equal(r.tagGet('tag1'), 'value2', "Right tag value");
      });

      it('may be deleted [tagSet+tagDelete+tagGet]', function () {
        var r = new Pinba.Request();

        r.tagSet('tag1', 'value1');
        r.tagDelete('tag1');

        assert.ok(typeof r.tagGet('tag1') == 'undefined', "Undefined tag");
      });

      it('have multi-get [tagSet+tagSet+tagsGet]', function () {
        var r = new Pinba.Request();

        r.tagSet('tag1', 'value1');
        r.tagSet('tag2', 'value2');

        assert.deepEqual(
          r.tagsGet(),
          {
            'tag1': 'value1',
            'tag2': 'value2'
          }
        );
      });
    });

    describe('timers', function () {
      it('should by properly generated [timerStart+timerStop]', function (done) {
        var r = new Pinba.Request();
        var timer1 = r.timerStart();
        setTimeout(function () {
          r.timerStop(timer1);

          var timer2 = r.timerStart();
          setTimeout(function () {
            r.timerStop(timer2);

            assert.ok(typeof r.timers['1'] === 'object');
            assert.ok(typeof r.timers['2'] === 'object');
            assert.ok(typeof r.timers['3'] === 'undefined');

            done();
          }, 100);
        }, 100);
      });

      it('should properly return info [timerStart+timerStop+timerGetInfo]', function (done) {
        var r = new Pinba.Request();
        var timer = r.timerStart();
        setTimeout(function () {
          r.timerStop(timer);

          var info = r.timerGetInfo(timer);

          assert.ok(!info.started, "Stopped");

          assert.ok(info.value * 1000 < 102, "Less than 102");
          assert.ok(info.value * 1000 > 98, "Greater than 98");

          done();
        }, 100);
      });

      it('should properly return info [timerAdd+timerGetInfo]', function () {
        var r = new Pinba.Request();
        var timer = r.timerAdd({tag: 'tagValue'}, 0.100);

        var info = r.timerGetInfo(timer);

        assert.ok(!info.started, "Stopped");

        assert.ok(info.value * 1000 < 102, "Less than 102");
        assert.ok(info.value * 1000 > 98, "Greater than 98");

        assert.deepEqual(info.tags, {tag: 'tagValue'}, "Correct tags");
      });

      it('may be deleted [timerDelete]', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerAdd({tag1: 'tag1value'}, 0.100);
        var timer2 = r.timerAdd({tag2: 'tag2value'}, 0.100);

        r.timerDelete(timer1);

        assert.deepEqual(_.keys(r.timers), [timer2]);
      });

      it('should properly works with tags [timerTagsMerge+timerTagsReplace]', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerStart({tag1: 'tag1value'});
        var timer2 = r.timerStart({tag2: 'tag2value'});

        r.timerTagsMerge(timer1, {tag1: 'tag1valueMerged', tag3: 'tag3value'});
        r.timerTagsMerge(timer2, {tag4: 'tag4value'});

        var info1 = r.timerGetInfo(timer1);
        assert.deepEqual(info1.tags, {tag1: 'tag1valueMerged', tag3:'tag3value'}, "Tags merged");

        var info2 = r.timerGetInfo(timer2);
        assert.deepEqual(info2.tags, {tag2: 'tag2value', tag4: 'tag4value'}, "Tags merged");

        r.timerTagsReplace(timer1, {tag3: 'tag3valueReplaced', tag4: 'tag4valueReplaced'});
        info1 = r.timerGetInfo(timer1);
        assert.deepEqual(info1.tags, {tag3: 'tag3valueReplaced', tag4: 'tag4valueReplaced'}, "Tags replaced");
      });

      it('should properly works with data [timerDataMerge+timerDataReplace]', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerStart({}, {data1: 'data1value'});
        var timer2 = r.timerStart({}, {data2: 'data2value'});

        r.timerDataMerge(timer1, {data1: 'data1valueReplaced', data3: 'data3value'});
        r.timerDataMerge(timer2, {data4: 'data4value'});

        var info1 = r.timerGetInfo(timer1);
        assert.deepEqual(info1.data, {data1: 'data1valueReplaced', data3: 'data3value'}, "Data merged");

        var info2 = r.timerGetInfo(timer2);
        assert.deepEqual(info2.data, {data2: 'data2value', data4: 'data4value'}, "Data merged");

        r.timerDataReplace(timer1, {data3: 'data3valueReplaced', data4: 'data4valueReplaced'});
        info1 = r.timerGetInfo(timer1);
        assert.deepEqual(info1.data, {data3: 'data3valueReplaced', data4: 'data4valueReplaced'}, "Data replaced");
      });

      it('timersStop() should stop all remaining timers', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerStart({}, {data1: 'data1value'});
        var timer2 = r.timerStart({}, {data2: 'data2value'});

        r.timerStop(timer1);

        r.timersStop();

        var info2 = r.timerGetInfo(timer2);
        assert.equal(info2.started, false, "timer2 stopped");
      });

      it('timersGet() should return timers', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerStart({}, {data1: 'data1value'});
        var timer2 = r.timerStart({}, {data2: 'data2value'});

        r.timerStop(timer1);

        var timers = r.timersGet();
        assert.deepEqual(timers, [timer1, timer2]);
      });

      it('timersGet() should support ONLY_STOPPED_TIMERS flag', function () {
        var r = new Pinba.Request();
        var timer1 = r.timerStart({}, {data1: 'data1value'});
        var timer2 = r.timerStart({}, {data2: 'data2value'});

        r.timerStop(timer1);

        var timers = r.timersGet(Pinba.ONLY_STOPPED_TIMERS);
        assert.deepEqual(timers, [timer1]);
      });
    });

    describe('and finally', function () {
      it('getInfo() should return request info', function () {
        var r = new Pinba.Request();

        r.setHostname('HOSTNAME');
        r.setServerName('SERVER_NAME');
        r.setScriptName('SCRIPT_NAME');
        r.setSchema('SCHEMA');

        r.tagSet('tag1', 'value1');
        r.tagSet('tag2', 'value2');
        r.tagSet('tag3', 'value2');

        r.timerAdd({tag1: 'value1'}, 0.1);
        r.timerAdd({tag2: 'value1'}, 0.2);
        r.timerAdd({tag3: 'value2'}, 0.3);

        var info = r.getInfo();

        delete info.req_time;
        delete info.ru_utime;
        delete info.ru_stime;

        assert.deepEqual(
          info,
          {
            hostname:       'HOSTNAME',
            server_name:    'SERVER_NAME',
            script_name:    'SCRIPT_NAME',
            schema:         'SCHEMA',
            req_count:      1,
            timers:         [
              {
                value: 0.1,
                started: false,
                tags: {tag1: 'value1'},
                data: undefined
              },
              {
                value: 0.2,
                started: false,
                tags: {tag2: 'value1'},
                data: undefined
              },
              {
                value: 0.3,
                started: false,
                tags: {tag3: 'value2'},
                data: undefined
              }
            ],
            tags:           {
              tag1: 'value1',
              tag2: 'value2',
              tag3: 'value2'
            }
          }
        );
      });

      it('getGPBMessageData() should return GPB message data', function () {
        var r = new Pinba.Request();

        r.setHostname('HOSTNAME');
        r.setServerName('SERVER_NAME');
        r.setScriptName('SCRIPT_NAME');
        r.setSchema('SCHEMA');

        r.tagSet('tag1', 'value1');
        r.tagSet('tag2', 'value2');
        r.tagSet('tag3', 'value2');

        r.timerAdd({tag1: 'value1'}, 0.1);
        r.timerAdd({tag2: 'value1'}, 0.2);
        r.timerAdd({tag3: 'value2'}, 0.3);

        r.timerAdd({tag3: 'value2'}, 0.4);

        r.timerAdd({tag1: 'value1', tag3: 'value2'}, 0.8);

        var data = r.getGPBMessageData();

        delete data.request_time;
        delete data.memory_peak;
        delete data.document_size;
        delete data.status;
        delete data.ru_utime;
        delete data.ru_stime;

        var expected_data = {
          hostname:       'HOSTNAME',
          server_name:    'SERVER_NAME',
          script_name:    'SCRIPT_NAME',
          schema:         'SCHEMA',

          request_count:    1,

          tag_name:         [0, 2, 4],
          tag_value:        [1, 3, 3],

          timer_hit_count:  [1, 1, 2, 1],
          timer_value:      [0.1, 0.2, 0.7, 0.8],
          timer_tag_count:  [1, 1, 1, 2],
          timer_tag_name:   [0, 2, 4, 0, 4],
          timer_tag_value:  [1, 1, 3, 1, 3],

          dictionary:       [
            'tag1',
            'value1',
            'tag2',
            'value2',
            'tag3'
          ]
        };

        assert.deepEqual(data.tag_name, expected_data.tag_name);
        assert.deepEqual(data.tag_value, expected_data.tag_value);

        assert.deepEqual(data.timer_hit_count, expected_data.timer_hit_count);
        assert.deepEqual(data.timer_value, expected_data.timer_value);
        assert.deepEqual(data.timer_tag_count, expected_data.timer_tag_count);
        assert.deepEqual(data.timer_tag_name, expected_data.timer_tag_name);
        assert.deepEqual(data.timer_tag_value, expected_data.timer_tag_value);

        assert.deepEqual(data, expected_data);
      });

      it('flush() should call gpb and dgram methods', function () {
        // Stubs
        var gpb_encoded_length_stub = sinon.stub(require('gpb'), "encoded_length");
        gpb_encoded_length_stub.returns(1);
        var gpb_encode_stub = sinon.stub(require('gpb'), "encode");
        gpb_encode_stub.returns(1);

        var socket_on_spy = sinon.spy();
        var socket_send_spy = sinon.spy();
        var socket_create_stub = sinon.stub(require('dgram'), "createSocket");
        socket_create_stub.returns({
          on:   socket_on_spy,
          send: socket_send_spy
        });
        // End

        var r = new Pinba.Request(), data;

        r.setHostname('HOSTNAME');
        r.setServerName('SERVER_NAME');
        r.setScriptName('SCRIPT_NAME');
        r.setSchema('SCHEMA');

        r.flush();

        assert.ok(socket_create_stub.calledOnce);
        assert.ok(socket_on_spy.calledOnce);
        assert.ok(socket_send_spy.calledOnce);

        var expected_data = {
          hostname:       'HOSTNAME',
          server_name:    'SERVER_NAME',
          script_name:    'SCRIPT_NAME',
          schema:         'SCHEMA',

          request_count:    1,

          tag_name:         [],
          tag_value:        [],

          timer_hit_count:  [],
          timer_value:      [],
          timer_tag_count:  [],
          timer_tag_name:   [],
          timer_tag_value:  [],

          dictionary:       []
        };

        data = gpb_encoded_length_stub.firstCall.args[0];

        delete data.request_time;
        delete data.memory_peak;
        delete data.document_size;
        delete data.status;
        delete data.ru_utime;
        delete data.ru_stime;

        assert.deepEqual(data, expected_data);

        // Stubs
        require('gpb').encoded_length.restore();
        require('gpb').encode.restore();

        socket_create_stub.restore();
        // End
      });

      it('flush() should support request data overriding', function () {
        // Stubs
        var gpb_encoded_length_stub = sinon.stub(require('gpb'), "encoded_length");
        gpb_encoded_length_stub.returns(1);
        var gpb_encode_stub = sinon.stub(require('gpb'), "encode");
        gpb_encode_stub.returns(1);

        var socket_on_spy = sinon.spy();
        var socket_send_spy = sinon.spy();
        var socket_create_stub = sinon.stub(require('dgram'), "createSocket");
        socket_create_stub.returns({
          on:   socket_on_spy,
          send: socket_send_spy
        });
        // End

        var r = new Pinba.Request(), data;

        r.setHostname('HOSTNAME');
        r.setServerName('SERVER_NAME');
        r.setScriptName('SCRIPT_NAME');
        r.setSchema('SCHEMA');

        r.flush({
          data: {
            script_name: 'SCRIPT_NAME2',
            schema:      'SCHEMA2'
          }
        });

        assert.ok(socket_create_stub.calledOnce);
        assert.ok(socket_on_spy.calledOnce);
        assert.ok(socket_send_spy.calledOnce);

        var expected_data = {
          hostname:       'HOSTNAME',
          server_name:    'SERVER_NAME',
          script_name:    'SCRIPT_NAME2',
          schema:         'SCHEMA2',

          request_count:    1,

          tag_name:         [],
          tag_value:        [],

          timer_hit_count:  [],
          timer_value:      [],
          timer_tag_count:  [],
          timer_tag_name:   [],
          timer_tag_value:  [],

          dictionary:       []
        };

        data = gpb_encoded_length_stub.firstCall.args[0];

        delete data.request_time;
        delete data.memory_peak;
        delete data.document_size;
        delete data.status;
        delete data.ru_utime;
        delete data.ru_stime;

        assert.deepEqual(data, expected_data);

        // Stubs
        require('gpb').encoded_length.restore();
        require('gpb').encode.restore();

        socket_create_stub.restore();
        // End
      });
    });
  });
});
