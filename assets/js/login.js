async function shaConv(data) {
    const msgUint8 = new TextEncoder().encode(data); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the data
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
}

async function passSha(form) {
    var totp = new jsOTP.totp();
    var totpPin = totp.getOtp(form.elements['factor2'].value);
    let pwd = await shaConv(form.elements['pwd'].value);
    let appkey = await shaConv(`${form.elements['uid'].value.toUpperCase()}|${form.elements['appkey'].value}`);
    let string = {
        source: 'API',
        apkversion: 'js:1.0.0',
        uid: form.elements['uid'].value.toUpperCase(),
        pwd: pwd,
        factor2: totpPin,
        vc: `${form.elements['uid'].value.toUpperCase()}_U`,
        appkey: appkey,
        imei: 'abc1234'
    };
    string = await JSON.stringify(string);
    return string;
}

let passwordForm = document.getElementById('passwordForm');
passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    passSha(passwordForm).then((str) => {
        fetch(`${passwordForm.action}/QuickAuth`, {
            method: 'POST',
            body: `jData=${str}&jKey=`,
            headers: { 'Content-Type': 'text/plain' }
        })
            .then((response) => response.json())
            .then((res) => {
                console.log(res);
                if (res.stat == 'Ok') {
                    localStorage.setItem('susertoken', res.susertoken);
                    localStorage.setItem('actid', res.actid);
                    localStorage.setItem('uid', res.actid);
                    document.cookie = "loggedIn=loggedIn";
                    window.location.replace('dashboard.html');
                }
                else {
                    document.getElementById('wrong').classList.remove('d-none');
                    console.log(res.emsg)
                }
            })
    });
});
if ('susertoken' in localStorage) {
    window.location.replace('dashboard.html');
}


let sTokenForm = document.getElementById('sTokenForm');
sTokenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fetch(`${sTokenForm.action}/UserDetails`, {
        method: 'POST',
        body: `jData={"uid":"${sTokenForm.elements['uid'].value.toUpperCase()}"}&jKey=${sTokenForm.elements['susertoken'].value}`,
        headers: { 'Content-Type': 'text/plain' }
    })
        .then((response) => response.json())
        .then((res) => {
            console.log(res);
            if (res.stat == 'Ok') {
                localStorage.setItem('susertoken', sTokenForm.elements['susertoken'].value);
                localStorage.setItem('actid', sTokenForm.elements['uid'].value.toUpperCase());
                localStorage.setItem('uid', sTokenForm.elements['uid'].value.toUpperCase());
                document.cookie = "loggedIn=loggedIn";
                window.location.replace('dashboard.html');
            }
            else {
                document.getElementById('wrong').classList.remove('d-none');
                console.log(res.emsg)
            }
        })
});
if ('susertoken' in localStorage) {
    window.location.replace('dashboard.html');
}

function passwordFormFun() {
    sTokenForm.classList.add('d-none');
    passwordForm.classList.remove('d-none');
}

function sTokenFormFun() {
    passwordForm.classList.add('d-none');
    sTokenForm.classList.remove('d-none');
}
