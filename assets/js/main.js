const url = `https://api.shoonya.com/NorenWClientTP`;
function getCookie(name) {
    // Split cookie string and get all individual name=value pairs in an array
    let cookieArr = document.cookie.split(";");

    // Loop through the array elements
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");

        /* Removing whitespace at the beginning of the cookie name
                                and compare it with the given string */
        if (name == cookiePair[0].trim()) {
            // Decode the cookie value and return
            return decodeURIComponent(cookiePair[1]);
        }
    }

    // Return null if not found
    return null;
}

if ("susertoken" in localStorage && getCookie("loggedIn")) {
    window.onload = document.getElementById("navbarDropdown").textContent = localStorage.getItem('uid');
    if (document.title === "Trading || Dashboard") {
        //window.onload = dash;
    } else if (document.title === "Trading || Orders") {
        window.onload = order;
    } else if (document.title === "Trading || Holdings") {
        window.onload = holdings;
    } else if (document.title === "Trading || Limits") {
        window.onload = limits;
    } else if (document.title === "Trading || Positions") {
        window.onload = positions;
    }
} else {
    alert("Not Logged In");
    window.location.replace("login.html");
    localStorage.clear();
}
// //login check

function shoonyaApi(values, reply) {
    let string = JSON.stringify(values);
    return fetch(`${url}/${reply}`, {
        method: "POST",
        body: `jData=${string}&jKey=${localStorage.getItem("susertoken")}`,
        headers: { "Content-Type": "text/plain" },
    })
        .then((response) => response.json())
        .catch((error) => {
            console.error("Error:", error);
        });
}

async function getInstrument(instrumentToken) {
    let instrumentName = null;
    let instrumentsList = document.getElementById('dlist').childNodes;
    for (var i = 0; i < instrumentsList.length; i++) {
        if (instrumentsList[i].value === instrumentToken) {
            instrumentName = instrumentsList[i].innerHTML;
        }
    }
    let LinkedScriptsDetail = {
        uid: localStorage.getItem("uid"),
        exch: "NSE",
        token: instrumentToken,
    };
    let linkedScripts = await shoonyaApi(LinkedScriptsDetail, "GetLinkedScrips");
    document.getElementById("instrumentName").innerHTML = instrumentName;
    document.getElementById("instrumentToken").setAttribute("class", instrumentToken);
    sendMessageToSocket(`{"t":"t","k":"NSE|${instrumentToken}"}`);
    if (linkedScripts.fut.length > 0) { optionSort(linkedScripts.opt_exp); } else {
        alert('No Script');
    }
    document.getElementById("instrumentSearch").value = "";
}
//get Instrument
function expSort(a, b) {
    let ad = new Date(a.exd.replaceAll('-', '/'));
    let bd = new Date(b.exd.replaceAll('-', '/'));
    let at = ad.getTime();
    let bt = bd.getTime();
    return at - bt;
}
//sort expiry
async function optionSort(optionExpiries) {
    let optionExpiriesSorted = await optionExpiries.sort(expSort);
    let expiryList = document.getElementById("expiryList");
    expiryList.innerHTML = "";
    optionExpiriesSorted.forEach((element) => {
        let option = document.createElement("option");
        option.innerHTML = element.exd;
        option.setAttribute("data-tsym", element.tsym);
        expiryList.appendChild(option);
    });
    setTimeout(() => {
        optionChain();
    }, 200);
}
async function optionChain() {
    let ltp = document.getElementById('instrumentToken');
    let expiryList = document.getElementById("expiryList");
    let selectedExpiry = expiryList.options[expiryList.selectedIndex];
    let tsymValue = selectedExpiry.getAttribute("data-tsym");
    let optionChainValues = {
        uid: localStorage.getItem("uid"),
        exch: "NFO",
        tsym: tsymValue,
        cnt: document.getElementById("strikeCount").value,
        strprc: ltp ? ltp.innerHTML : 10000,
    };
    let optionChain = await shoonyaApi(optionChainValues, "GetOptionChain");
    let ce = await optionChain.values.filter((option) => option.optt === "CE");
    let strikePrice = await ce.sort(
        (a, b) => parseFloat(a.strprc) - parseFloat(b.strprc)
    );
    let atm = await strikePrice.reduce((a, b) => {
        return Math.abs(b.strprc - optionChainValues.strprc) <
            Math.abs(a.strprc - optionChainValues.strprc)
            ? b
            : a;
    });
    let optionChainBody = document.getElementById("optionChainBody");
    optionChainBody.innerHTML = "";
    await strikePrice.forEach((element) => {
        let row = optionChainBody.insertRow(-1);
        let cell1 = row.insertCell(0); //ce ltp
        let cell2 = row.insertCell(1); //strike
        let cell3 = row.insertCell(2); //pe ltp
        cell1.setAttribute("onclick", "addToPanel(this)");
        cell2.setAttribute("id", element.strprc);
        cell2.innerHTML = element.strprc;
        cell3.setAttribute("onclick", "addToPanel(this)");
        element.strprc == atm.strprc ? row.classList.add("atm") : null;
    });
    optionChain.values.forEach((element) => {
        let td = document.getElementById(`${element.strprc}`).parentElement;
        element.optt === "CE"
            ? td.children[0].classList.add(element.token)
            : td.children[2].classList.add(element.token);
        sendMessageToSocket(`{"t":"t","k":"NFO|${element.token}"}`);
    });
}

async function addToPanel(option) {
    let instruementInfoValues = {
        uid: localStorage.getItem("uid"),
        exch: "NFO",
        token: option.classList[0],
    };
    let optionInfo = await shoonyaApi(instruementInfoValues, "GetSecurityInfo");
    document.getElementById("optionName").innerHTML = optionInfo.cname + ' ';
    var smallElement = document.createElement('small');
    smallElement.textContent = optionInfo.exch;
    document.getElementById("optionName").appendChild(smallElement);
    document.getElementById("optionName").setAttribute("data-tsym", optionInfo.tsym);
    document.getElementById("optionLTP").setAttribute("class", optionInfo.token);
    document.getElementById("optionQty").setAttribute("step", optionInfo.ls);
    document.getElementById("optionQty").setAttribute("value", optionInfo.ls);
    document.getElementById("optionQty").setAttribute("min", optionInfo.ls);

    document.getElementById("optionPrice").value = 0;
    document.getElementById("optionPrice").setAttribute("min", optionInfo.lc);
    document.getElementById("optionPrice").setAttribute("max", optionInfo.uc);
    document.getElementById("optionPrice").setAttribute("step", optionInfo.ti);
    document.getElementById("optionOrderType").value = "LMT";
    document.getElementById("optionPrice").removeAttribute("disabled");
    document.getElementById("optionOrderType").removeAttribute("disabled");
    document.getElementById("optionProductType").removeAttribute("disabled");
    document.getElementById("optionQty").removeAttribute("disabled");
    document.getElementById("optionBuyButton").removeAttribute("disabled");
    document.getElementById("optionSellButton").removeAttribute("disabled");
    sendMessageToSocket(`{"t":"t","k":"${optionInfo.exch}|${optionInfo.token}"}`);
    getMargins();
    chart(optionName, optionInfo.token, optionInfo.exch);

}
//chart("bchart", optionInfo.token, "NFO");

async function getMargins() {
    let orderMarginValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: document.getElementById("optionName").childNodes[1].textContent,
        tsym: document.getElementById("optionName").getAttribute("data-tsym"),
        qty: document.getElementById("optionQty").value,
        prc: document.getElementById("optionPrice").value == 0 ? document.getElementById('optionLTP').textContent : document.getElementById("optionPrice").value,
        prd: document.getElementById("optionProductType").value == "MIS" ? "I" : "M",
        trantype: "B",
        prctyp: document.getElementById("optionOrderType").value,
        rorgqty: "0",
        rorgprc: "0",
    };
    let buyMargin = await shoonyaApi(orderMarginValues, "GetOrderMargin");
    document.getElementById("buyMargin").innerHTML = buyMargin.marginused;
    buyMargin.remarks == "Order Success"
        ? document.getElementById("buyMargin").setAttribute("class", "link-success")
        : document.getElementById("buyMargin").setAttribute("class", "link-danger");
    orderMarginValues.trantype = "S";
    let sellMargin = await shoonyaApi(orderMarginValues, "GetOrderMargin");
    document.getElementById("sellMargin").innerHTML = sellMargin.marginused;
    sellMargin.remarks == "Order Success"
        ? document.getElementById("sellMargin").setAttribute("class", "link-success")
        : document.getElementById("sellMargin").setAttribute("class", "link-danger");
}


async function placeOrder(button) {
    let mkt_protection = "2";
    let orderValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: document.getElementById("optionName").childNodes[1].textContent,
        tsym: document.getElementById("optionName").getAttribute("data-tsym"),
        qty: document.getElementById("optionQty").value,
        prc: document.getElementById("optionPrice").value == 0 ? document.getElementById('optionLTP').textContent : document.getElementById("optionPrice").value,
        prd: document.getElementById("optionProductType").value == "MIS" ? "I" : "M",
        trgprc: document.getElementById("optionPrice").value,
        mkt_protection: document.getElementById("optionPrice").value == 0 ? mkt_protection : null,
        trantype: button.id == "optionBuyButton" ? "B" : "S",
        prctyp: document.getElementById("optionOrderType").value,
        ret: "DAY",
    };
    await shoonyaApi(orderValues, "PlaceOrder");
}

async function order() {
    let orderBookValues = {
        uid: localStorage.getItem("uid"),
    };
    let orders = await shoonyaApi(orderBookValues, "OrderBook");
    if (orders.stat === "Not_Ok") {
        document.getElementById("noOrders").classList.remove("d-none");
        let headerDiv = document.getElementById('orderHeader').parentElement.parentElement.parentElement;
        headerDiv.nextElementSibling.innerHTML = '';
        headerDiv.innerHTML = '';

    } else {
        let orderBookDiv = document.getElementById('orderBookDiv');
        orderBookDiv.innerHTML = '';
        orders.sort((a, b) => {
            return b.ordenttm - a.ordenttm;
        });
        document.getElementById('orderHeader').innerHTML = 'Order List (' + orders.length + ')';
        orders.forEach((element) => {
            // Create parent container div
            var container = document.createElement("div");
            container.className = "row";

            // Create main order div
            var order = document.createElement("div");
            order.className = "order-main new-order";
            container.appendChild(order);

            // Create order adjustment div
            var orderAdjust = document.createElement("div");
            orderAdjust.className = "order-list order-adjust";
            order.appendChild(orderAdjust);

            // Create "delete" button link
            var deleteLink = document.createElement("a");
            deleteLink.setAttribute("type", "button");
            deleteLink.setAttribute("data-norenordno", element.norenordno);
            deleteLink.setAttribute("onclick", "cancel(this)");
            element.status != 'OPEN' ? deleteLink.style.pointerEvents = "none" : null;
            orderAdjust.appendChild(deleteLink);

            // Create "delete" icon
            var deleteIcon = document.createElement("i");
            deleteIcon.className = "bi bi-x-lg bg-danger text-white";
            deleteLink.appendChild(deleteIcon);

            // Create "edit" button link
            var editLink = document.createElement("a");
            editLink.setAttribute("type", "button");
            editLink.setAttribute("data-norenordno", element.norenordno);
            editLink.setAttribute("onclick", "modifyOrderPanel(this)");
            element.status != 'OPEN' ? editLink.style.pointerEvents = "none" : null;
            orderAdjust.appendChild(editLink);

            // Create "edit" icon
            var editIcon = document.createElement("i");
            editIcon.className = "bi bi-pencil-fill bg-secondary text-white";
            editLink.appendChild(editIcon);

            // Create time div
            var timeDiv = document.createElement("div");
            timeDiv.className = "order-list";
            order.appendChild(timeDiv);

            // Create time heading
            var timeHeading = document.createElement("h6");
            timeHeading.textContent = element.norentm.slice(0, 8);;
            timeDiv.appendChild(timeHeading);

            // Create order type div
            var orderTypeDiv = document.createElement("div");
            orderTypeDiv.className = "order-list";
            order.appendChild(orderTypeDiv);

            // Create order type heading
            var orderTypeHeading = document.createElement("h6");
            orderTypeDiv.appendChild(orderTypeHeading);

            // Create order type badge
            var orderTypeBadge = document.createElement("span");
            orderTypeBadge.className = element.trantype == 'B' ? "badge bg-success" : "badge bg-danger";
            orderTypeBadge.textContent = element.trantype == 'B' ? 'BUY' : 'SELL';
            orderTypeHeading.appendChild(orderTypeBadge);

            // Create stock info div
            var stockInfoDiv = document.createElement("div");
            stockInfoDiv.classList.add('inst_space', "order-list");
            order.appendChild(stockInfoDiv);

            // Create stock info heading
            var stockInfoHeading = document.createElement("h6");
            stockInfoHeading.textContent = element.dname ? element.dname + ' ' : element.tsym + ' ';
            stockInfoHeading.setAttribute("data-tsym", element.tsym);
            stockInfoDiv.appendChild(stockInfoHeading);

            // Create stock info exchange code
            var stockInfoExchange = document.createElement("small");
            stockInfoExchange.textContent = element.exch;
            stockInfoHeading.appendChild(stockInfoExchange);

            // Create order type div
            var orderTypeDiv = document.createElement("div");
            orderTypeDiv.className = "order-list";
            order.appendChild(orderTypeDiv);

            // Create order type heading
            var orderTypeHeading = document.createElement("h6");
            orderTypeDiv.appendChild(orderTypeHeading);

            // Create order type text
            var orderTypeText = document.createElement("h6");
            orderTypeText.textContent = element.s_prdt_ali;
            orderTypeHeading.appendChild(orderTypeText);

            // Create quantity div
            var quantityDiv = document.createElement("div");
            quantityDiv.className = "order-list";
            order.appendChild(quantityDiv);

            // Create quantity heading
            var quantityHeading = document.createElement("h6");
            quantityHeading.textContent = element.fillshares ? element.fillshares : '0/' + element.qty;
            quantityDiv.appendChild(quantityHeading);

            // Create price div
            var priceDiv = document.createElement("div");
            priceDiv.className = "order-list";
            order.appendChild(priceDiv);

            // Create price heading
            var priceHeading = document.createElement("h6");
            priceHeading.textContent = element.avgprc ? element.avgprc : element.prc;
            priceDiv.appendChild(priceHeading);

            // Create status div
            var statusDiv = document.createElement("div");
            statusDiv.className = "order-list";
            order.appendChild(statusDiv);

            // Create status heading
            var statusHeading = document.createElement("h6");
            statusDiv.appendChild(statusHeading);

            // Create status badge
            var statusBadge = document.createElement("span");
            statusBadge.textContent = element.status;
            statusBadge.className = element.status == 'REJECTED' ? "badge bg-danger" : element.status == 'PENDING' || element.status == 'OPEN' || element.status == 'CANCELED' ? "badge bg-secondary" : "badge bg-success";
            statusHeading.appendChild(statusBadge);

            // Append the created HTML structure to the body
            orderBookDiv.appendChild(container);
        });
    }
}

async function cancel(cancelButton) {
    let cancelOrderValues = {
        norenordno: cancelButton.getAttribute("data-norenordno"),
        uid: localStorage.getItem("uid"),
    };
    await shoonyaApi(cancelOrderValues, "CancelOrder");
    order();
}

async function modifyOrderPanel(modifyButton) {
    let modifyOrderPanel = document.getElementById('orderPanel');
    modifyOrderPanel.classList.remove('d-none');
    let orderRow = modifyButton.parentElement.parentElement;
    let instruementSearchValues = {
        uid: localStorage.getItem("uid"),
        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
        stext: orderRow.childNodes[3].childNodes[0].childNodes[0].textContent,
    };
    let instrumentSearchInfo = await shoonyaApi(instruementSearchValues, "SearchScrip");
    let instruementInfoValues = {
        uid: localStorage.getItem("uid"),
        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
        token: instrumentSearchInfo.values[0].token,
    };
    let optionInfo = await shoonyaApi(instruementInfoValues, "GetSecurityInfo");
    document.getElementById("optionName").innerHTML = optionInfo.cname + ' ';
    document.getElementById("optionName").setAttribute("data-tsym", optionInfo.tsym);
    document.getElementById("optionName").setAttribute("data-norenordno", modifyButton.getAttribute('data-norenordno'));
    var smallElement = document.createElement('small');
    smallElement.textContent = optionInfo.exch;
    document.getElementById("optionName").appendChild(smallElement);
    document.getElementById("optionLTP").setAttribute("class", optionInfo.token);
    document.getElementById("optionQty").setAttribute("step", optionInfo.ls);
    document.getElementById("optionQty").setAttribute("value", optionInfo.ls);
    document.getElementById("optionQty").setAttribute("min", optionInfo.ls);

    document.getElementById("optionPrice").value = 0;
    document.getElementById("optionPrice").setAttribute("min", optionInfo.lc);
    document.getElementById("optionPrice").setAttribute("max", optionInfo.uc);
    document.getElementById("optionPrice").setAttribute("step", optionInfo.ti);
    document.getElementById("optionOrderType").value = "LMT";
    document.getElementById("optionPrice").removeAttribute("disabled");
    document.getElementById("optionOrderType").removeAttribute("disabled");
    document.getElementById("optionProductType").removeAttribute("disabled");
    document.getElementById("optionQty").removeAttribute("disabled");
    document.getElementById("optionBuyButton").removeAttribute("disabled");
    document.getElementById("optionSellButton").removeAttribute("disabled");
    sendMessageToSocket(`{"t":"t","k":"${optionInfo.exch}|${optionInfo.token}"}`);
    getMargins();
}

async function modifyOrder(button) {
    let mkt_protection = "10";
    console.log(document.getElementById("optionName").nextElementSibling)
    let orderValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: document.getElementById("optionName").children[0].textContent,
        norenordno: document.getElementById("optionName").getAttribute("data-norenordno"),
        tsym: document.getElementById("optionName").getAttribute("data-tsym"),
        qty: document.getElementById("optionQty").value,
        prc: document.getElementById("optionPrice").value == 0 ? document.getElementById('optionLTP').textContent : document.getElementById("optionPrice").value,
        prd: document.getElementById("optionProductType").value == "MIS" ? "I" : "M",
        trgprc: document.getElementById("optionPrice").value,
        mkt_protection: document.getElementById("optionPrice").value == 0 ? mkt_protection : null,
        trantype: button.id == "optionBuyButton" ? "B" : "S",
        prctyp: document.getElementById("optionOrderType").value,
        ret: "DAY",
    };
    await shoonyaApi(orderValues, "ModifyOrder");
    order();
}

async function holdings() {
    let holdingValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        prd: "C",
    };
    let holding = await shoonyaApi(holdingValues, "Holdings");
    if (holding.length == "0") {
        document.getElementById("noHoldings").classList.remove("d-none");
        document.getElementById("holdingDiv").classList.add("d-none");
        let headerDiv = document.getElementById('holdingHeader').parentElement.parentElement.parentElement;
        headerDiv.nextElementSibling.innerHTML = '';
        headerDiv.innerHTML = '';
    } else {
        let holdingDiv = document.getElementById("holdingDiv");
        holdingDiv.classList.remove("d-none");
        document.getElementById("totalDiv").classList.remove("d-none");
        let total = 0;
        document.getElementById('holdingHeader').innerHTML = 'Holdings (' + holding.length + ')';
        holding.forEach((element) => {
            // Create div element with "row" class
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('row');

            // Create div element with "order-main new-order" classes
            const orderMainDiv = document.createElement('div');
            orderMainDiv.classList.add('order-main', 'new-order');
            let qty = 0;
            // Create seven div elements with "order-list" class and append them to the "order-main" div
            for (let i = 0; i < 6; i++) {
                const orderListDiv = document.createElement('div');
                orderListDiv.classList.add('order-list');

                // Create h6 element with respective text content and append it to the "order-list" div
                const h6 = document.createElement('h6');
                switch (i) {
                    case 0:
                        h6.textContent = element.exch_tsym[0].tsym;
                        break;
                    case 1:
                        element.dpqty ? qty = parseInt(element.holdqty) + parseInt(element.dpqty) + parseInt(element.btstqty) : qty = parseInt(element.holdqty) + parseInt(element.btstqty);
                        h6.textContent = qty;
                        break;
                    case 2:
                        h6.textContent = element.upldprc;;
                        break;
                    case 3:
                        h6.textContent = '0.00';
                        h6.classList.add(element.exch_tsym[0].token);
                        break;
                    case 4:
                        h6.textContent = '0.00';
                        break;
                    case 5:
                        h6.textContent = '0.00%';
                        break;
                    // case 6:
                    //     h6.textContent = '0.00%';
                    //     break;
                }
                orderListDiv.appendChild(h6);

                orderMainDiv.appendChild(orderListDiv);
            }

            rowDiv.appendChild(orderMainDiv);

            // Append the "row" div to the body or any other desired location in the document
            holdingDiv.appendChild(rowDiv);
            sendMessageToSocket(
                `{"t":"t","k":"${element.exch_tsym[0].exch}|${element.exch_tsym[0].token}"}`
            );
            // Add some text to the new cells:
            total += parseFloat(element.upldprc) * parseFloat(qty);
            document.getElementById("total").innerHTML = total.toFixed(2);
        });
        setInterval(() => {
            let current = 0;
            let net = 0;
            let dayt = 0;
            let pc = 0;
            for (let i = 0; i < holdingDiv.childNodes.length; i++) {
                const element = holdingDiv.childNodes[i].childNodes[0];
                if (element) {
                    currentValue = element.childNodes[1].textContent * element.childNodes[3].textContent;
                    investedValue = element.childNodes[1].textContent * element.childNodes[2].textContent;
                    livePNL = currentValue - investedValue;
                    percentage = (currentValue / investedValue) * 100;
                    percentage = percentage == NaN ? 0.00 : percentage;
                    console.log(livePNL, percentage)
                    element.childNodes[4].childNodes[0].textContent = livePNL.toFixed(2);
                    element.childNodes[5].childNodes[0].textContent = percentage.toFixed(2) + '%';
                    current += currentValue;
                    // dayt += 
                    // pc +=
                }
            }
            totalPNL = current - total;
            document.getElementById("current").innerHTML = current.toFixed(2);
            //document.getElementById("day").innerHTML = dayt.toFixed(2);
            document.getElementById("totalPNL").innerHTML = totalPNL.toFixed(2);
            // dayt > 0
            //     ? document.getElementById("day").setAttribute("class", "green")
            //     : document.getElementById("day").setAttribute("class", "red");
            // dayt > 0
            //     ? document.getElementById("dayP").setAttribute("class", "green")
            //     : document.getElementById("dayP").setAttribute("class", "red");
            current > total
                ? document.getElementById("totalPNL").setAttribute("class", "link-success")
                : document.getElementById("totalPNL").setAttribute("class", "link-danger");
            current > total
                ? document.getElementById("netPercentage").setAttribute("class", "link-success")
                : document.getElementById("netPercentage").setAttribute("class", "link-danger");
            document.getElementById("netPercentage").innerHTML = (totalPNL / total * 100).toFixed(2) + '%';
        }, 5000);
    }
}

async function positions() {
    let positionValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
    };
    let position = await shoonyaApi(positionValues, "PositionBook");
    if (position.stat == "Not_Ok") {
        document.getElementById("noPositions").classList.remove("d-none");
        document.getElementById("positionsDiv").classList.add("d-none");
        let headerDiv = document.getElementById('positionHeader').parentElement.parentElement.parentElement;
        headerDiv.nextElementSibling.innerHTML = '';
        document.getElementById('totalMTM').parentElement.parentElement.parentElement.classList.add('d-none')
        headerDiv.innerHTML = '';
    } else {
        let positionsDiv = document.getElementById('positionsDiv');
        positionsDiv.innerHTML = ''
        position.sort((a, b) => {
            return a.netqty - b.netqty;
        });
        document.getElementById('positionHeader').innerHTML = 'Positions (' + position.length + ')';
        position.forEach((element) => {
            // Create the main container div
            var posDiv = document.createElement("div");
            posDiv.classList.add("row");
            // Create the main div
            var mainDiv = document.createElement("div");
            mainDiv.classList.add("order-main");
            mainDiv.classList.add("new-order");

            // Append the main div to pos div
            posDiv.appendChild(mainDiv);
            // Create the position type badge div
            var checkDiv = document.createElement("div");
            checkDiv.classList.add("order-list");

            // Create the adjustments div
            var adjustmentsDiv = document.createElement("div");
            adjustmentsDiv.classList.add("order-list");
            adjustmentsDiv.classList.add("order-adjust");


            // Create the checkbox div
            var checkboxDiv = document.createElement("div");
            checkboxDiv.classList.add("form-check");

            // Create the checkbox input
            var checkboxInput = document.createElement("input");
            checkboxInput.classList.add("form-check-input", "cb");
            checkboxInput.setAttribute("type", "checkbox");
            checkboxInput.setAttribute("onclick", "hideUnhideExitAllButton()")


            // Create the anchor tags and icons for adjustments
            var deleteAnchor = document.createElement("a");
            deleteAnchor.setAttribute("type", "button");
            deleteAnchor.setAttribute("onclick", "exitOrderPanel(this)")
            var deleteIcon = document.createElement("i");
            deleteIcon.classList.add("bi", "bi-x-lg", "bg-danger", "text-white");
            deleteAnchor.appendChild(deleteIcon);

            var editAnchor = document.createElement("a");
            editAnchor.setAttribute("type", "button");
            editAnchor.setAttribute("onclick", "convert(this)")
            var editIcon = document.createElement("i");
            editIcon.classList.add("bi", "bi-pencil-fill", "bg-secondary", "text-white");
            editAnchor.appendChild(editIcon);

            var copyAnchor = document.createElement("a");
            copyAnchor.setAttribute("type", "button");
            copyAnchor.setAttribute("onclick", "cloneOrder(this)")
            var copyIcon = document.createElement("i");
            copyIcon.classList.add("bi", "bi-copy", "bg-secondary", "text-white");
            copyAnchor.appendChild(copyIcon);

            // Append the anchor tags to adjustments div
            adjustmentsDiv.appendChild(deleteAnchor);
            adjustmentsDiv.appendChild(editAnchor);
            adjustmentsDiv.appendChild(copyAnchor);

            // Append the checkbox input to checkbox div
            checkboxDiv.appendChild(checkboxInput);
            // Append the checkbox div to check div
            checkDiv.appendChild(checkboxDiv);
            // Append the check div to main div
            if (element.netqty == 0) {
                copyAnchor.style.pointerEvents = "none";
                editAnchor.style.pointerEvents = "none";
                deleteAnchor.style.pointerEvents = "none";
                checkboxInput.disabled = true;
            }
            mainDiv.appendChild(checkDiv);
            // Append the adjustments div to the main container div
            mainDiv.appendChild(adjustmentsDiv);

            // Create the position type badge div
            var positionTypeDiv = document.createElement("div");
            positionTypeDiv.classList.add("order-list");
            var positionTypeBadge = document.createElement("h6");
            var positionTypeSpan = document.createElement("span");
            positionTypeSpan.classList.add("badge", "bg-secondary");
            positionTypeSpan.innerText = element.prd == "M" || element.prd == "C" ? "NRML" : "MIS";
            positionTypeBadge.appendChild(positionTypeSpan);
            positionTypeDiv.appendChild(positionTypeBadge);
            mainDiv.appendChild(positionTypeDiv);

            // Create the instrument name and exchange div
            var instrumentDiv = document.createElement("div");
            instrumentDiv.classList.add("order-list");
            instrumentDiv.classList.add("inst_space");
            var instrumentNameHeading = document.createElement("h6");
            instrumentNameHeading.innerText = element.dname ? element.dname + ' ' : element.tsym + ' ';
            instrumentNameHeading.setAttribute("data-tsym", element.tsym)
            var exchangeSmallElement = document.createElement("small");
            exchangeSmallElement.innerText = element.exch;
            instrumentNameHeading.appendChild(exchangeSmallElement);
            instrumentDiv.appendChild(instrumentNameHeading);
            mainDiv.appendChild(instrumentDiv);

            // Create and append the remaining order-list divs with h6 elements
            var quantityDiv = document.createElement("div");
            quantityDiv.classList.add("order-list");
            var quantityH6 = document.createElement("h6");
            quantityH6.innerText = element.netqty;
            quantityDiv.appendChild(quantityH6);
            mainDiv.appendChild(quantityDiv);

            var averageCostDiv = document.createElement("div");
            averageCostDiv.classList.add("order-list");
            var averageCostH6 = document.createElement("h6");
            averageCostH6.innerText = element.daybuyqty == "0" && element.daysellqty == "0" ? element.upldprc : element.netavgprc;
            averageCostDiv.appendChild(averageCostH6);
            mainDiv.appendChild(averageCostDiv);

            var livePriceDiv = document.createElement("div");
            livePriceDiv.classList.add("order-list");
            var livePriceH6 = document.createElement("h6");
            livePriceH6.classList.add(element.token);
            livePriceH6.innerText = "0.00";
            livePriceDiv.appendChild(livePriceH6);
            mainDiv.appendChild(livePriceDiv);

            var MTMDiv = document.createElement("div");
            MTMDiv.classList.add("order-list");
            var MTMH6 = document.createElement("h6");
            MTMH6.innerText = "0.00";
            MTMH6.setAttribute("class", "link-success");
            MTMDiv.appendChild(MTMH6);
            mainDiv.appendChild(MTMDiv);

            var realisedPNLDiv = document.createElement("div");
            realisedPNLDiv.classList.add("order-list");
            var realisedPNLH6 = document.createElement("h6");
            let calculatedPNL = 0;
            if (parseInt(element.cfbuyqty) == 0 && parseInt(element.cfsellqty) == 0)
                calculatedPNL = parseFloat(element.rpnl);
            else if (parseInt(element.daybuyqty) > 0 && parseInt(element.daybuyqty) > parseInt(element.daysellqty)) {
                calculatedPNL = (parseFloat(element.upldprc) - parseFloat(element.daybuyavgprc)) * parseInt(element.cfsellqty);
                calculatedPNL += (parseFloat(element.daysellavgprc) - parseFloat(element.daybuyavgprc)) * parseInt(element.daysellqty);
            }
            else if (parseInt(element.daysellqty) > 0 && parseInt(element.daysellqty) > parseInt(element.daybuyqty)) {
                calculatedPNL = (parseFloat(element.daysellavgprc) - parseFloat(element.upldprc)) * parseInt(element.cfbuyqty);
                calculatedPNL += (parseFloat(element.daysellavgprc) - parseFloat(element.daybuyavgprc)) * parseInt(element.daybuyqty);
            }
            realisedPNLH6.innerText = calculatedPNL.toFixed(2);
            calculatedPNL > -0.01 ? realisedPNLH6.setAttribute("class", "link-success") : realisedPNLH6.setAttribute("class", "link-danger");;
            realisedPNLDiv.classList.add("on_mobile");
            realisedPNLDiv.appendChild(realisedPNLH6);
            mainDiv.appendChild(realisedPNLDiv);

            var spreadDiv = document.createElement("div");
            spreadDiv.classList.add("order-list");
            spreadDiv.classList.add("on_mobile");
            var spreadH6 = document.createElement("h6");
            spreadH6.classList.add(element.token + 'df')
            spreadH6.innerText = "0.00";
            spreadDiv.appendChild(spreadH6);
            mainDiv.appendChild(spreadDiv);

            var percentageChangeDiv = document.createElement("div");
            var percentageChangeH6 = document.createElement("h6");
            percentageChangeDiv.classList.add("order-list");
            percentageChangeH6.innerText = "0.00%";
            percentageChangeH6.setAttribute("class", "link-success");
            percentageChangeDiv.appendChild(percentageChangeH6);
            mainDiv.appendChild(percentageChangeDiv);

            // Append the main container div to the body or any other desired parent element
            positionsDiv.appendChild(posDiv);
            sendMessageToSocket(`{"t":"t","k":"${element.exch}|${element.token}"}`);
            sendMessageToSocket(`{"t":"d","k":"${element.exch}|${element.token}"}`);
        })
        setInterval(() => {
            let positionS = positionsDiv.children;
            let totalMTM = 0;
            let totalPNL = 0;
            for (let i = 0; i < positionS.length; i++) {
                const element = positionS[i].children[0];
                qty = element.children[4].textContent;
                if (qty != 0) {
                    avgCost = element.children[5].textContent;
                    ltp = element.children[6].textContent;
                    mtm = element.children[7].children[0].textContent = ((ltp - avgCost) * qty).toFixed(3);
                    mtm > -0.01 ? element.children[7].children[0].setAttribute("class", "link-success") : element.children[7].children[0].setAttribute("class", "link-danger");
                    totalMTM += parseFloat(mtm);
                    change = ((parseFloat(ltp) / parseFloat(avgCost) * 100) - 100).toFixed(2);
                    element.children[10].children[0].textContent = change + " %";
                    qty > 0 && change > -0.01 ? element.children[10].children[0].setAttribute("class", "link-success") : element.children[10].children[0].setAttribute("class", "link-danger")
                }
                pnl = element.children[8].textContent;
                totalPNL += parseFloat(pnl);
            }
            document.getElementById('totalMTM').textContent = (totalMTM).toFixed(3);
            totalMTM > 0.01 ? document.getElementById('totalMTM').setAttribute("class", "link-success") : document.getElementById('totalMTM').setAttribute("class", "link-danger");
            document.getElementById('totalPNL').textContent = (totalPNL).toFixed(3);
            totalPNL > 0.01 ? document.getElementById('totalPNL').setAttribute("class", "link-success") : document.getElementById('totalPNL').setAttribute("class", "link-danger");



        }, 2);
    }
}
async function exitOrderPanel(exitButton) {
    let modifyOrderPanel = document.getElementById('orderPanel');
    modifyOrderPanel.classList.remove('d-none');
    let orderRow = exitButton.parentElement.parentElement;
    let instruementSearchValues = {
        uid: localStorage.getItem("uid"),
        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
        stext: orderRow.childNodes[3].childNodes[0].textContent.slice(0, -4),
    };
    let instrumentSearchInfo = await shoonyaApi(instruementSearchValues, "SearchScrip");
    function getValue(response, symbol) {
        // Loop through the values array
        for (let i = 0; i < response.values.length; i++) {
            // Check if the symbol matches tsym
            if (response.values[i].tsym === symbol) {
                return response.values[i].token;
            }
        }
        return null; // Return null if symbol is not found
    }
    let instruementInfoValues = {
        uid: localStorage.getItem("uid"),
        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
        token: instrumentSearchInfo.values[0].token,
    };
    if (instruementSearchValues.exch == 'BSE') {
        instruementInfoValues.token = getValue(instrumentSearchInfo, instruementSearchValues.stext)
    }
    let optionInfo = await shoonyaApi(instruementInfoValues, "GetSecurityInfo");
    document.getElementById("optionName").innerHTML = optionInfo.cname + ' ';
    document.getElementById("optionName").setAttribute("data-tsym", optionInfo.tsym);
    var smallElement = document.createElement('small');
    smallElement.textContent = optionInfo.exch;
    document.getElementById("optionName").appendChild(smallElement);
    document.getElementById("optionLTP").setAttribute("class", optionInfo.token);
    document.getElementById("optionQty").setAttribute("step", optionInfo.ls);
    document.getElementById("optionQty").setAttribute("value", Math.abs(orderRow.childNodes[4].textContent));
    document.getElementById("optionQty").setAttribute("min", optionInfo.ls);

    document.getElementById("optionPrice").value = 0;
    document.getElementById("optionPrice").setAttribute("min", optionInfo.lc);
    document.getElementById("optionPrice").setAttribute("max", optionInfo.uc);
    document.getElementById("optionPrice").setAttribute("step", optionInfo.ti);
    document.getElementById("optionOrderType").value = "LMT";
    document.getElementById("optionPrice").removeAttribute("disabled");
    document.getElementById("optionOrderType").removeAttribute("disabled");
    document.getElementById("optionProductType").removeAttribute("disabled");
    document.getElementById("optionQty").removeAttribute("disabled");
    document.getElementById("optionBuyButton").removeAttribute("disabled");
    document.getElementById("optionSellButton").removeAttribute("disabled");
    getMargins();
}

async function cloneOrder(cloneButton) {
    let orderRow = cloneButton.parentElement.parentElement;
    let orderValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
        tsym: orderRow.childNodes[3].childNodes[0].getAttribute("data-tsym"),
        qty: `${Math.abs(orderRow.childNodes[4].textContent)}`,
        prc: orderRow.childNodes[6].textContent,
        prd: orderRow.childNodes[2].textContent == "MIS" ? "I" : "M",
        trgprc: orderRow.childNodes[6].textContent,
        mkt_protection: '2',
        trantype: orderRow.childNodes[4].textContent > 0 ? "B" : "S",
        prctyp: "LMT",
        ret: "DAY",
    };
    await shoonyaApi(orderValues, "PlaceOrder");
    positions();
}

async function exitOrder(button) {
    let mkt_protection = "2";
    let orderValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: document.getElementById("optionName").children[0].textContent,
        tsym: document.getElementById("optionName").getAttribute("data-tsym"),
        qty: document.getElementById("optionQty").value,
        prc: document.getElementById("optionPrice").value,
        prd: document.getElementById("optionProductType").value == "MIS" ? "I" : "M",
        trgprc: document.getElementById("optionPrice").value,
        trantype: button.id == "optionBuyButton" ? "B" : "S",
        mkt_protection: document.getElementById("optionPrice").value == 0 ? mkt_protection : null,
        prctyp: document.getElementById("optionOrderType").value,
        ret: "DAY",
    };
    await shoonyaApi(orderValues, "PlaceOrder");
    positions();
}
function convert(convertButton) {
    let orderRow = convertButton.parentElement.parentElement;
    let exchange = orderRow.childNodes[3].childNodes[0].textContent.slice(-3);
    let alert = document.getElementById("alert");
    let convertValues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
        exch: exchange,
        tsym: orderRow.childNodes[3].children[0].getAttribute("data-tsym"),
        qty: `${Math.abs(orderRow.childNodes[4].textContent)}`,
        prd:
            orderRow.children[2].textContent == "NRML"
                ? "I"
                : exchange == "NFO"
                    ? "M"
                    : "C",
        prevprd:
            orderRow.children[2].textContent == "MIS"
                ? "I"
                : exchange == "NFO"
                    ? "M"
                    : "C",
        trantype: parseInt(orderRow.childNodes[4].textContent) > 0 ? "B" : "S",
        postype: "DAY",
    };
    shoonyaApi(convertValues, "ProductConversion").then((ans) => {
        alert.classList.remove("d-none");
        setTimeout(function () {
            alert.classList.add("d-none");
        }, 5000);
        if (ans.stat == "Ok") {
            alert.classList.remove('bg-danger')
            alert.classList.add('bg-success')
            document.getElementById("msg").innerHTML = `Position Converted Successfully`;
        } else if (ans.stat == "Not_Ok") {
            alert.classList.remove('bg-success')
            alert.classList.add('bg-danger')
            document.getElementById("msg").innerHTML = `Unable to Converted`;
        }
        positions();
    });

}

async function selectAllButton(box) {
    if (box.checked == true) {
        let checkboxes = document.getElementsByClassName("cb");
        for (let checkbox of checkboxes) {
            checkbox.disabled == false ?
                checkbox.checked = true : null;
        }
        hideUnhideExitAllButton();
    } else {
        let checkboxes = document.getElementsByClassName("cb");
        for (let checkbox of checkboxes) {
            checkbox.checked = false;
        }
        hideUnhideExitAllButton();
    }
}

async function hideUnhideExitAllButton() {
    let checkboxes = document.getElementsByClassName("cb");
    for (let checkbox of checkboxes) {
        if (checkbox.checked == true) {
            document.getElementById("exitSelectedButton").classList.remove("d-none");
            break;
        } else {
            document.getElementById("exitSelectedButton").classList.add("d-none");
        }
    }
}

async function exitSelectedButton() {
    let checkboxes = document.getElementsByClassName("cb");
    let rows = [];
    for (let checkbox of checkboxes) {
        if (checkbox.checked == true) {
            let row = await checkbox.parentElement.parentElement.parentElement;
            rows.push(row);
        }
    }
    setTimeout(() => {
        rows.forEach((orderRow, i) => {
            setTimeout(
                function () {
                    let orderValues = {
                        uid: localStorage.getItem("uid"),
                        actid: localStorage.getItem("actid"),
                        exch: orderRow.childNodes[3].childNodes[0].textContent.slice(-3),
                        tsym: orderRow.childNodes[3].childNodes[0].getAttribute("data-tsym"),
                        qty: `${Math.abs(orderRow.childNodes[4].textContent)}`,
                        prc: orderRow.childNodes[6].textContent,
                        prd: orderRow.childNodes[2].textContent == "MIS" ? "I" : "M",
                        trgprc: orderRow.childNodes[6].textContent,
                        mkt_protection: '2',
                        trantype: orderRow.childNodes[4].textContent > 0 ? "S" : "B",
                        prctyp: "LMT",
                        ret: "DAY",
                    };
                    shoonyaApi(orderValues, "PlaceOrder");
                }, i * 100)
        });
    }, 200);
}

async function chart(instrumentName, instruementToken, instruementExchange) {
    let timeValues = {
        uid: localStorage.getItem("uid"),
        exch: instruementExchange,
        token: instruementToken,
        st: `${Math.round((Date.now() - 3456000000) / 1000)}`,
        et: `${Math.round(Date.now() / 1000)}`,
    };
    let c1M = await shoonyaApi(timeValues, "TPSeries");
    timeValues.intrv = "5";
    let c5M = await shoonyaApi(timeValues, "TPSeries");
    timeValues.intrv = "15";
    let c15M = await shoonyaApi(timeValues, "TPSeries");
    timeValues.intrv = "30";
    let c30M = await shoonyaApi(timeValues, "TPSeries");
    timeValues.intrv = "60";
    let c60M = await shoonyaApi(timeValues, "TPSeries");

    async function reversePrice(ohlcs) {
        let chartdata = await ohlcs.map((ohlc) => {
            let timestamp = new Date(ohlc.ssboe * 1000).getTime() / 1000;
            //open: parseFloat(ohlc.into), high: parseFloat(ohlc.inth), low: parseFloat(ohlc.intl), close: parseFloat(ohlc.intc)
            //value: parseFloat(ohlc.intc)
            return {
                time: timestamp + 19800,
                open: parseFloat(ohlc.into),
                high: parseFloat(ohlc.inth),
                low: parseFloat(ohlc.intl),
                close: parseFloat(ohlc.intc),
            };
        });
        return chartdata.reverse();
    }
    async function reverseVol(ohlcs) {
        let chartdata = await ohlcs.map((ohlc) => {
            let timestamp = new Date(ohlc.ssboe * 1000).getTime() / 1000;
            //open: parseFloat(ohlc.into), high: parseFloat(ohlc.inth), low: parseFloat(ohlc.intl), close: parseFloat(ohlc.intc)
            //value: parseFloat(ohlc.intc)
            return {
                time: timestamp + 19800,
                value: ohlc.oi,
            };
        });
        return chartdata.reverse();
    }

    if (c1M.stat == "Not_Ok") {
        const chartDiv = document.getElementById('chartDiv');
        chartDiv.innerHTML = "No Data";
        chartDiv.style.color = "white";
        let switcherElement = chartDiv.nextElementSibling;
        switcherElement.innerHTML = "";
        let button = switcherElement.nextElementSibling;
        button.innerHTML = "";
    } else {
        const chartDiv = document.getElementById('chartDiv');
        chartDiv.innerHTML = "";
        const chartProperties = {
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
            layout: {
                textColor: "#000000",
                background: {
                    type: "solid",
                    color: "rgba(120, 123, 134, 1)",// rgba(93, 96, 107, 1),
                }
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.25,
                },
            },
            grid: {
                vertLines: {
                    color: "rgba(120, 123, 134, 0)",
                },
                horzLines: {
                    color: "rgba(120, 123, 134, 0)",
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: "#fff",
                },
                horzLine: {
                    color: "#fff",
                },
            },
            autoSize: true,
        };
        const chart = LightweightCharts.createChart(chartDiv, chartProperties);
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartDiv) { return; }
            const newRect = entries[0].contentRect;
            chart.applyOptions({ height: newRect.height, width: newRect.width });
        }).observe(chartDiv);
        let p1M = await reversePrice(c1M);
        let p5M = await reversePrice(c5M);
        let p15M = await reversePrice(c15M);
        let p30M = await reversePrice(c30M);
        let p60M = await reversePrice(c60M);
        let v1M = await reverseVol(c1M);
        let v5M = await reverseVol(c5M);
        let v15M = await reverseVol(c15M);
        let v30M = await reverseVol(c30M);
        let v60M = await reverseVol(c60M);
        ////// data feed
        const renderOHLC = (price, vol) => {
            const { open, high, low, close } = price;
            let OHLC = '<span> O ' + open + ' H ' + high + ' L ' + low + ' C ' + close + ' OI ' + vol.value + '</span>'
            legend.children[1].innerHTML = OHLC;
        };
        let ohlcValues = null;
        let volValues = null;
        chart.subscribeCrosshairMove((param) => {
            ohlcValues = param.seriesData.get(priceSeries);
            volValues = param.seriesData.get(volSeries);
            ohlcValues ? renderOHLC(ohlcValues, volValues) : null;
        });
        let legend = document.getElementById('chartLegend');
        legend.innerHTML = `
            <h4>
                ${instrumentName.textContent} <span class="${instruementToken}"></span>
            </h4>
            <h4></h4>
        `;
        ///////// switcher
        function createSimpleSwitcher(
            items,
            activeItem,
            activeItemChangedCallback
        ) {
            let switcherElement = chartDiv.nextElementSibling;
            switcherElement.innerHTML = "";
            let intervalElements = items.map(function (item) {
                let itemEl = document.createElement("button");
                itemEl.innerText = item;
                itemEl.classList.add("switcher-item");
                itemEl.classList.toggle("switcher-active-item", item === activeItem);
                itemEl.addEventListener("click", function () {
                    onItemClicked(item);
                });
                switcherElement.appendChild(itemEl);
                return itemEl;
            });
            function onItemClicked(item) {
                if (item === activeItem) {
                    return;
                }
                intervalElements.forEach(function (element, index) {
                    element.classList.toggle(
                        "switcher-active-item",
                        items[index] === item
                    );
                });
                activeItem = item;
                activeItemChangedCallback(item);
            }
            return switcherElement;
        }
        let intervals = ["1M", "5M", "15M", "30M", "60M"];
        let priceData = new Map([
            ["1M", p1M],
            ["5M", p5M],
            ["15M", p15M],
            ["30M", p30M],
            ["60M", p60M],
        ]);
        let volData = new Map([
            ["1M", v1M],
            ["5M", v5M],
            ["15M", v15M],
            ["30M", v30M],
            ["60M", v60M],
        ]);
        let switcherElement = createSimpleSwitcher(
            intervals,
            intervals[0],
            syncToInterval
        );
        let priceSeries = null;
        let volSeries = null;
        function syncToInterval(interval) {
            if (priceSeries || volSeries) {
                chart.removeSeries(priceSeries);
                chart.removeSeries(volSeries);
            }
            priceSeries = chart.addCandlestickSeries({
                upColor: "#FFFFFF",
                downColor: "#000000",
                borderDownColor: "#000000",
                borderUpColor: "#000000",
                wickDownColor: "#000000",
                wickUpColor: "#000000",
            });
            volSeries = chart.addLineSeries({
                color: "black",
                priceFormat: {
                    type: "volume",
                },
                priceScaleId: "",
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });
            volSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8, // highest point of the series will be 70% away from the top
                    bottom: 0,
                },
            });
            priceSeries.setData(priceData.get(interval));
            volSeries.setData(volData.get(interval));
        }
        syncToInterval(intervals[0]);
        //////////////////////////
        let lastIndex = c1M.length - 1;
        let currentIndex = lastIndex + 1;
        let currentBar = {
            open: null,
            high: null,
            low: null,
            close: null,
            time: Math.round(Date.now() / 1000) + 19800,
        };
        let currentVol = {
            value: null,
            time: Math.round(Date.now() / 1000) + 19800,
        };
        function mergeTickToBar(result) {
            if (currentBar.open === null) {
                currentBar.open = result.lp;
                currentBar.high = result.lp;
                currentBar.low = result.lp;
                currentBar.close = result.lp;
            } else {
                currentBar.close = result.lp;
                currentBar.high = Math.max(currentBar.high, result.lp);
                currentBar.low = Math.min(currentBar.low, result.lp);
            }
            if (result.oi) {
                currentVol.value = result.oi;
                volSeries.update(currentVol);
            }
            priceSeries.update(currentBar);
        }
        /// button
        let button = switcherElement.nextElementSibling;
        button.style.left =
            chartDiv.getBoundingClientRect().right + window.scrollX + -100 + "px";
        button.style.top =
            chartDiv.getBoundingClientRect().bottom + window.scrollY + -65 + "px";
        let timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(function () {
            let buttonVisible = timeScale.scrollPosition() < 0;
            button.style.display = buttonVisible ? "block" : "none";
        });
        button.addEventListener("click", function () {
            timeScale.scrollToRealTime();
        });
        button.addEventListener("mouseover", function () {
            button.style.background = "rgba(250, 250, 250, 1)";
            button.style.color = "#000";
        });
        button.addEventListener("mouseout", function () {
            button.style.background = "rgba(250, 250, 250, 0.6)";
            button.style.color = "#4c525e";
        });
        //
        worker.port.addEventListener("message", function (msg) {
            let result = msg.data;
            if (result.tk == instruementToken && result.lp != undefined) {
                mergeTickToBar(result);
                let currentTime = new Date;
                let currentTimeBar = new Date(((currentBar.time) - 19800) * 1000);
                if (currentTime.getMinutes() != currentTimeBar.getMinutes()) {
                    // move to next bar
                    currentIndex++;
                    let timestamp = Math.round(Date.now() / 1000);
                    currentBar = {
                        open: null,
                        high: null,
                        low: null,
                        close: null,
                        time: timestamp + 19800,
                    };
                    currentVol = {
                        value: null,
                        time: timestamp + 19800,
                    };
                }
                //candleSeries.update({ time: Math.round(Date.now() / 1000) + 19800, value: result.lp });
            }
            else {
                null;
            }
        })
    }
}

async function limits() {
    let livalues = {
        uid: localStorage.getItem("uid"),
        actid: localStorage.getItem("actid"),
    };
    let limit = await shoonyaApi(livalues, "Limits");
    let total = limit.collateral ? parseFloat(limit.cash) + parseFloat(limit.collateral) + parseFloat(limit.unclearedcash) : parseFloat(limit.cash) + parseFloat(limit.payin) - parseFloat(limit.payout);
    document.getElementById("t").innerHTML = total.toFixed(2);
    document.getElementById("cash").innerHTML = limit.cash ? limit.cash : 0;
    document.getElementById("payin").innerHTML = limit.payin ? limit.payin : 0;
    document.getElementById("payout").innerHTML = limit.payout ? limit.payout : 0;
    document.getElementById("pm").innerHTML = limit.peak_mar ? limit.peak_mar : 0;
    document.getElementById("mu").innerHTML = limit.marginused
        ? limit.marginused
        : 0;
    document.getElementById("co").innerHTML = limit.collateral
        ? parseFloat(limit.collateral)
        : 0;
    document.getElementById("pr").innerHTML = limit.premium ? limit.premium : 0;
    document.getElementById("expo").innerHTML = limit.expo ? limit.expo : 0;
    document.getElementById("urt").innerHTML = limit.urmtom ? limit.urmtom : 0;
    document.getElementById("mc").innerHTML = limit.grcoll ? limit.grcoll : 0;
    document.getElementById("urc").innerHTML = limit.unclearedcash ? limit.unclearedcash : 0;
}
function logout() {
    localStorage.clear();
    window.location.replace('login.html');
}

var draggable = document.getElementsByClassName('draggable')[0];
if (draggable) {
    var posX = 0,
        posY = 0,
        mouseX = 0,
        mouseY = 0;

    draggable.addEventListener('mousedown', mouseDown, false);
    window.addEventListener('mouseup', mouseUp, false);

    function mouseDown(e) {
        e.preventDefault();
        posX = e.clientX - draggable.offsetLeft;
        posY = e.clientY - draggable.offsetTop;
        window.addEventListener('mousemove', moveElement, false);
    }

    function mouseUp() {
        window.removeEventListener('mousemove', moveElement, false);
    }

    function moveElement(e) {
        mouseX = e.clientX - posX;
        mouseY = e.clientY - posY;
        document.getElementById('orderPanel').style.left = mouseX + 'px';
        document.getElementById('orderPanel').style.top = mouseY + 'px';
    }
}