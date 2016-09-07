
var HelpToolTip = {};
HelpToolTip.lastTipElement = undefined;

HelpToolTip.onMouseOver = function onMouseOver(event) {
    if (HelpToolTip.lastTipElement != undefined)
        HelpToolTip.hide();

    var element = document.getElementById("help_" + event.toElement.getAttribute("data-help"));
    element.style.top = 0;
    element.style.left = 0;

    var width = element.offsetWidth;
    var height = element.offsetHeight;

    if (event.pageX - width - 50 + document.body.scrollLeft >= 0) {
        element.style.left = (event.pageX - width - 5) + 'px';
    } else {
        element.style.left = (event.pageX + 15) + 'px';
    }

    if (event.pageY - height - 50 + document.body.scrollTop >= 0) {
        element.style.top = (event.pageY - height - 5) + 'px';
    } else {
        element.style.top = (event.pageY + 15) + 'px';
    }

//	setTimeout(function() {
//		element.style.visibility = 'visible';
//	}, 500);
//	element.style.visibility = 'visible';

    setTimeout(HelpToolTip.show, 600);
    HelpToolTip.lastTipElement = element;
};

HelpToolTip.onMouseOut = function onMouseOut() {
    HelpToolTip.hide();
};

HelpToolTip.show = function show() {
    if (HelpToolTip.lastTipElement)
        HelpToolTip.lastTipElement.style.visibility = 'visible';
};

HelpToolTip.hide = function hide() {
    if (HelpToolTip.lastTipElement) {
        //HelpToolTip.lastTipElement.parentNode.removeChild(HelpToolTip.lastTipElement);
        HelpToolTip.lastTipElement.style.visibility = 'hidden';
        HelpToolTip.lastTipElement = undefined;
    }
};

HelpToolTip.enableTooltips = function enableTooltips() {
    $("span[data-help]").click(HelpToolTip.show).mouseout(HelpToolTip.onMouseOut).mouseover(HelpToolTip.onMouseOver);
    //var helpElements = document.getElementsByClassName('help');

    //for (var i = 0, helpElement; helpElement = helpElements[i]; i++) {
    //	helpElement.onmouseover = HelpToolTip.onMouseOver;
    //	helpElement.onmouseout = HelpToolTip.onMouseOut;
    //	helpElement.onclick = HelpToolTip.show;
    //}
};