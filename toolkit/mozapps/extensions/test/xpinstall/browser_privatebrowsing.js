let gDidSeeChannel = false;

function check_channel(subject) {
  if (!(subject instanceof Ci.nsIHttpChannel)) {
    return;
  }
  let channel = subject.QueryInterface(Ci.nsIHttpChannel);
  let uri = channel.URI;
  if (!uri || !uri.spec.endsWith("amosigned.xpi")) {
    return;
  }
  gDidSeeChannel = true;
  ok(true, "Got request for " + uri.spec);

  let loadInfo = channel.loadInfo;
  is(
    loadInfo.originAttributes.privateBrowsingId,
    1,
    "Request should have happened using private browsing"
  );
}
// ----------------------------------------------------------------------------
// Tests we send the right cookies when installing through an InstallTrigger call
let gPrivateWin;
let gPopupShown;
async function test() {
  waitForExplicitFinish(); // have to call this ourselves because we're async.
  Harness.installConfirmCallback = confirm_install;
  Harness.installEndedCallback = install_ended;
  Harness.installsCompletedCallback = finish_test;
  Harness.finalContentEvent = "InstallComplete";
  gPrivateWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });
  Harness.setup(gPrivateWin);

  PermissionTestUtils.add(
    "http://example.com/",
    "install",
    Services.perms.ALLOW_ACTION
  );

  var triggers = encodeURIComponent(
    JSON.stringify({
      "Unsigned XPI": {
        URL: TESTROOT + "amosigned.xpi",
        IconURL: TESTROOT + "icon.png",
        toString() {
          return this.URL;
        },
      },
    })
  );
  gPrivateWin.gBrowser.selectedTab = BrowserTestUtils.addTab(
    gPrivateWin.gBrowser
  );
  Services.obs.addObserver(check_channel, "http-on-before-connect");
  BrowserTestUtils.loadURI(
    gPrivateWin.gBrowser,
    TESTROOT + "installtrigger.html?" + triggers
  );
  gPopupShown = BrowserTestUtils.waitForEvent(
    gPrivateWin.PanelUI.notificationPanel,
    "popupshown"
  );
}

function confirm_install(panel) {
  is(panel.getAttribute("name"), "XPI Test", "Should have seen the name");
  return true;
}

function install_ended(install, addon) {
  Assert.deepEqual(
    install.installTelemetryInfo,
    { source: "test-host", method: "installTrigger" },
    "Got the expected install.installTelemetryInfo"
  );
  install.cancel();
}

const finish_test = async function(count) {
  ok(
    gDidSeeChannel,
    "Should have seen the request for the XPI and verified it was sent the right way."
  );
  is(count, 1, "1 Add-on should have been successfully installed");

  Services.obs.removeObserver(check_channel, "http-on-before-connect");

  PermissionTestUtils.remove("http://example.com", "install");

  const results = await ContentTask.spawn(
    gPrivateWin.gBrowser.selectedBrowser,
    null,
    () => {
      return {
        return: content.document.getElementById("return").textContent,
        status: content.document.getElementById("status").textContent,
      };
    }
  );

  is(results.return, "true", "installTrigger should have claimed success");
  is(results.status, "0", "Callback should have seen a success");

  // Explicitly click the "OK" button to avoid the panel reopening in the other window once this
  // window closes (see also bug 1535069):
  await gPopupShown;
  gPrivateWin.PanelUI.notificationPanel
    .querySelector("popupnotification[popupid=addon-installed]")
    .button.click();

  // Now finish the test:
  await BrowserTestUtils.closeWindow(gPrivateWin);
  Harness.finish(gPrivateWin);
  gPrivateWin = null;
  gPopupShown = null;
};
