const fs = require('fs');

// Patch today-cockpit.css
{
  let tc = fs.readFileSync('frontend/today-cockpit.css', 'utf8');
  tc = tc.replace(
    'body:has(#today.active) .topbar{background:#071f17;border-bottom-color:rgba(111,202,143,.16);box-shadow:none;backdrop-filter:none}',
    'body[data-theme="healthy"]:has(#today.active) .topbar{background:#071f17;border-bottom-color:rgba(111,202,143,.16);box-shadow:none;backdrop-filter:none}'
  );
  tc = tc.replace(
    'body:has(#today.active) .topbar .crumb{color:#92b7a0}',
    'body[data-theme="healthy"]:has(#today.active) .topbar .crumb{color:#92b7a0}'
  );
  tc = tc.replace(
    'body:has(#today.active) .topbar .crumb b{color:#e2f3e6}',
    'body[data-theme="healthy"]:has(#today.active) .topbar .crumb b{color:#e2f3e6}'
  );
  tc = tc.replace(
    'body:has(#today.active) .topbar .pill{border-color:rgba(130,211,159,.22);background:rgba(8,43,30,.88);color:#dff0e4}',
    'body[data-theme="healthy"]:has(#today.active) .topbar .pill{border-color:rgba(130,211,159,.22);background:rgba(8,43,30,.88);color:#dff0e4}'
  );
  tc = tc.replace(
    'body:has(#today.active) .topbar .avatar{border-color:rgba(143,220,164,.48);background:linear-gradient(135deg,#296548,#89d99f)}',
    'body[data-theme="healthy"]:has(#today.active) .topbar .avatar{border-color:rgba(143,220,164,.48);background:linear-gradient(135deg,#296548,#89d99f)}'
  );
  tc = tc.replace(
    'body:has(#today.active) .topbar{background:#041a12}',
    'body[data-theme="healthy"]:has(#today.active) .topbar{background:#041a12}'
  );
  fs.writeFileSync('frontend/today-cockpit.css', tc, 'utf8');
  console.log('today-cockpit.css topbar scoped to healthy');
}

// Patch trader-wisdom-v3.css
{
  let tw = fs.readFileSync('frontend/trader-wisdom-v3.css', 'utf8');
  tw = tw.replace(
    'body:has(#wisdom.active) .topbar{background:#09241eee;color:#ecebdc;border-bottom:1px solid #dbe7cd1c;backdrop-filter:blur(12px)}',
    'body[data-theme="healthy"]:has(#wisdom.active) .topbar{background:#09241eee;color:#ecebdc;border-bottom:1px solid #dbe7cd1c;backdrop-filter:blur(12px)}'
  );
  tw = tw.replace(
    'body:has(#wisdom.active) .crumb,body:has(#wisdom.active) .crumb b{color:#e5ebd9}',
    'body[data-theme="healthy"]:has(#wisdom.active) .crumb,body[data-theme="healthy"]:has(#wisdom.active) .crumb b{color:#e5ebd9}'
  );
  fs.writeFileSync('frontend/trader-wisdom-v3.css', tw, 'utf8');
  console.log('trader-wisdom-v3.css topbar scoped to healthy');
}
