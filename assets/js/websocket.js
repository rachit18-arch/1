let worker = new SharedWorker("./assets/js/worker.js");
let rejected = 0;
let completed = 0;
worker.port.addEventListener("message", function (msg) {
    let result = msg.data;
    let a = msg.data.s;
    document.getElementById('navbarDropdown').style.color =
        "#157347";
    if (a == 'OK' && a != undefined) {
        let actid = localStorage.getItem('actid');
        sendMessageToSocket(`{"t:o""k:${actid}"}`);
    }
    if (result == 'WS Disconnected') {
        document.getElementById("navbarDropdown").style.color =
            "#bb2d3b";
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
    if (result.lp) {
        let elements = document.getElementsByClassName(`${result.tk}`);
        if (elements.length > 0) {
            for (let j = 0; j < elements.length; j++) {
                const element = elements[j];
                element.innerHTML = result.lp;
            }
        }
    }
    if (result.t == "df") {
        let spread = document.getElementsByClassName(result.tk + 'df')[0];
        spread ?
            result.bp1 && result.sp1 ? spread.innerHTML = (result.sp1 - result.bp1).toFixed(2) : null : null;
    }
    if (result.t == "om") {
        let alert = document.getElementById("alert");
        // let x = document.getElementById("myAudio");
        // x.muted = false;
        // x.play();
        alert.classList.remove("d-none");
        document.getElementById(
            "msg"
        ).innerHTML = `Order ID ${result.norenordno} for ${result.tsym} in ${result.exch} is ${result.status}`;
        setTimeout(function () {
            alert.classList.add("d-none");
        }, 5000);
        // if (document.title == "Positions" || document.title == "Orders") {
        //     setTimeout(function () {
        //         location.reload();
        //     }, 10000);
        // }
        if (result.status == "REJECTED") {
            alert.classList.remove('bg-success')
            alert.classList.add('bg-danger')
            rejected += 1;
            document.getElementById('rejected').classList.remove('d-none');
            document.getElementById('rejected').innerHTML = rejected;
        }
        if (result.status == "COMPLETED") {
            alert.classList.remove('bg-danger')
            alert.classList.add('bg-success')
            completed += 1;
            document.getElementById('completed').classList.remove('d-none');
            document.getElementById('completed').innerHTML = completed;
        }
    }
}, false);
worker.port.start();
const sendLocalto = message => {
    worker.port.postMessage({
        action: 'connect',
        value: message,
    })
}
const sendMessageToSocket = message => {
    worker.port.postMessage({
        action: 'send',
        value: message,
    });
};
let wsValues = {
    t: "c",
    uid: localStorage.getItem("uid"),
    actid: localStorage.getItem("actid"),
    susertoken: localStorage.getItem("susertoken"),
    source: "API",
};
sendLocalto(wsValues);