(function (window) {
  "use strict";

  // Shared by Clip Forge, Record Forge and Video Forge. All three pages use
  // identical DOM ids for the YouTube connect/upload UI, but differ in what
  // local variable holds the current video blob and which i18n key names
  // the "no video yet" upload error, so both are passed in as config.
  function init(opts) {
    var getBlob = opts.getBlob;
    var noBlobErrorKey = opts.noBlobErrorKey;

    var ytClientId = document.getElementById('ytClientId');
    var connectYtBtn = document.getElementById('connectYtBtn');
    var ytConnectedBox = document.getElementById('ytConnectedBox');
    var ytUploadFields = document.getElementById('ytUploadFields');
    var ytTitle = document.getElementById('ytTitle');
    var ytDesc = document.getElementById('ytDesc');
    var ytTags = document.getElementById('ytTags');
    var ytPrivacy = document.getElementById('ytPrivacy');
    var ytCategory = document.getElementById('ytCategory');
    var uploadYtBtn = document.getElementById('uploadYtBtn');
    var ytResultBox = document.getElementById('ytResultBox');
    var ytErrorBox = document.getElementById('ytErrorBox');
    var progressWrap = document.getElementById('progressWrap');
    var progressLabel = document.getElementById('progressLabel');
    var progressFill = document.getElementById('progressFill');
    var progressPct = document.getElementById('progressPct');

    var accessToken = null;
    var tokenClient = null;

    // Check the Client ID's shape as it is typed, so a pasted secret or project
    // ID is caught here instead of after a trip through Google's sign-in. This
    // only checks the format; Google still decides whether the ID works.
    var clientIdCheck = document.createElement('p');
    clientIdCheck.className = 'yt-hint';
    clientIdCheck.id = 'ytClientIdCheck';
    clientIdCheck.setAttribute('aria-live', 'polite');
    ytClientId.insertAdjacentElement('afterend', clientIdCheck);

    function clientIdProblem(id) {
      if (/^GOCSPX-/i.test(id)) return I18N.t('ytClientIdIsSecret', 'That is your client secret. Paste the Client ID instead: it ends in .apps.googleusercontent.com. Keep the secret private.');
      if (/^AIza/.test(id)) return I18N.t('ytClientIdIsApiKey', 'That is an API key. Paste the OAuth Client ID instead: it ends in .apps.googleusercontent.com.');
      if (/\s/.test(id)) return I18N.t('ytClientIdHasSpaces', 'The Client ID has spaces in it. Copy it again from Google Cloud Console.');
      if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(id)) return I18N.t('ytClientIdBadFormat', 'That doesn\'t look like a Client ID. It should look like 1234567890-abc123….apps.googleusercontent.com.');
      return '';
    }
    function checkClientId() {
      var id = ytClientId.value.trim();
      var problem = id ? clientIdProblem(id) : '';
      clientIdCheck.textContent = !id ? '' : problem ? '⚠ ' + problem : '✓ ' + I18N.t('ytClientIdLooksRight', 'The format looks right. Connect to check it with Google.');
      clientIdCheck.style.color = problem ? '#f0a35e' : '#7fd49a';
      return problem;
    }
    ytClientId.addEventListener('input', checkClientId);
    checkClientId();

    function refreshUploadEnabled() {
      uploadYtBtn.disabled = !(getBlob() && accessToken);
    }

    function showYtError(msg) { ytErrorBox.textContent = msg; ytErrorBox.classList.add('show'); }
    function clearYtError() { ytErrorBox.textContent = ''; ytErrorBox.classList.remove('show'); }

    function ensureTokenClient() {
      if (!window.google || !google.accounts || !google.accounts.oauth2) return null;
      var clientId = ytClientId.value.trim();
      if (!clientId) return null;
      if (tokenClient && tokenClient.__clientId === clientId) return tokenClient;
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        callback: function (resp) {
          if (resp.error) { showYtError(I18N.t('ytErrorSignInFailed').replace('{error}', resp.error)); return; }
          accessToken = resp.access_token;
          clearYtError();
          ytConnectedBox.classList.add('show');
          ytUploadFields.style.display = 'block';
          refreshUploadEnabled();
        }
      });
      tokenClient.__clientId = clientId;
      return tokenClient;
    }

    connectYtBtn.addEventListener('click', function () {
      clearYtError();
      if (!ytClientId.value.trim()) { showYtError(I18N.t('ytErrorNoClientId')); return; }
      var problem = checkClientId();
      if (problem) { showYtError(problem); return; }
      var client = ensureTokenClient();
      if (!client) { showYtError(I18N.t('ytErrorLibraryNotLoaded')); return; }
      client.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });

    uploadYtBtn.addEventListener('click', async function () {
      clearYtError();
      ytResultBox.classList.remove('show');
      var blob = getBlob();
      if (!blob) { showYtError(I18N.t(noBlobErrorKey)); return; }
      if (!accessToken) { showYtError(I18N.t('ytErrorConnectFirst')); return; }

      var metadata = {
        snippet: {
          title: ytTitle.value.trim() || I18N.t('ytDefaultTitle'),
          description: ytDesc.value.trim(),
          tags: ytTags.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          categoryId: ytCategory.value
        },
        status: { privacyStatus: ytPrivacy.value }
      };

      uploadYtBtn.disabled = true;
      uploadYtBtn.textContent = I18N.t('startingUploadLabel');
      progressWrap.classList.add('show');
      progressLabel.textContent = I18N.t('uploadingLabel');
      progressFill.style.width = '0%';
      progressPct.textContent = '0%';

      try {
        var initResp = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': blob.type || 'video/webm',
            'X-Upload-Content-Length': String(blob.size)
          },
          body: JSON.stringify(metadata)
        });
        if (!initResp.ok) {
          var errBody = await initResp.json().catch(function () { return null; });
          var msg = errBody && errBody.error && errBody.error.message ? errBody.error.message : I18N.t('ytErrorRequestFailed').replace('{status}', initResp.status);
          throw new Error(msg);
        }
        var uploadUrl = initResp.headers.get('Location');
        if (!uploadUrl) {
          throw new Error(I18N.t('ytErrorNoUploadUrl'));
        }

        await new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', blob.type || 'video/webm');
          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
              var pct = Math.round((e.loaded / e.total) * 100);
              progressFill.style.width = pct + '%';
              progressPct.textContent = pct + '%';
            }
          };
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch (e) { reject(new Error(I18N.t('ytErrorResponseUnreadable'))); }
            } else {
              reject(new Error(I18N.t('ytErrorUploadFailedStatus').replace('{status}', xhr.status).replace('{text}', xhr.responseText)));
            }
          };
          xhr.onerror = function () { reject(new Error(I18N.t('ytErrorNetwork'))); };
          xhr.send(blob);
        }).then(function (data) {
          var privacyNote = ytPrivacy.value === 'private' ? I18N.t('ytPrivacyNotePrivate') : ytPrivacy.value;
          ytResultBox.innerHTML = '✓ ' + I18N.t('ytSuccessUploadedPrefix') + ' <a href="https://youtu.be/' + data.id + '" target="_blank" rel="noopener" style="color:#244731;text-decoration:underline;">' + I18N.t('ytWatchLinkLabel') + '</a> (' + privacyNote + ').';
          ytResultBox.classList.add('show');
        });
      } catch (err) {
        showYtError(err.message || I18N.t('ytErrorGeneric'));
      } finally {
        uploadYtBtn.disabled = false;
        uploadYtBtn.textContent = I18N.t('uploadToYoutubeLabel');
        progressWrap.classList.remove('show');
        refreshUploadEnabled();
      }
    });

    return { refreshUploadEnabled: refreshUploadEnabled };
  }

  window.YouTubeUpload = { init: init };
})(window);
