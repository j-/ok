QUnit.module('mixin');

QUnit.test('ok.Mixin()', function (assert) {
	var Summable = ok.Mixin.create({
		sum: function (arr) {
			return ok.Items(arr).reduce(function (total, val) {
				return total + val;
			}, 0);
		}
	});
	assert.equal(typeof Summable, 'function', 'Returns a constructor');
	var Numbers = ok.Items.extend(Summable);
	var nums = Numbers.create([1, 2, 3]);
	var arr = [1, 2, 3];
	assert.equal(6, nums.sum(), 'Can be used as a prototype method');
	assert.equal(6, Numbers.sum(nums), 'Can be used as a static function on mixed in class');
	assert.equal(6, Numbers.sum(arr), 'Can be used as a static function on non-mixed in class');
});