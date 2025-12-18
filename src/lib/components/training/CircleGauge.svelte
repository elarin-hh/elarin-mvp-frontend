<script>
    export let value = 0;
    export let info = '';
    export let color;
    export let gradientStart;
    export let gradientEnd;
    export let trackColor;
    export let textColor;
    export let thickness = '5%';             
    export let checkable = false;
    export let checked = false;
    export let decimals = false;
    export let showKnob = true;
    export let knobColor;

    const gradientId = `circlebar-gradient-${Math.random().toString(36).slice(2)}`;
    const knobGradientId = `${gradientId}-knob`;

    let resolvedColor;
    let knobFillSolid;
    let knobFill;
    let knobGroup;
    let knobX = 0;
    let knobY = 0;
    let knobOuterRadius = 0;
    let knobCoreRadius = 0;
    let newValue;                         
    let radius, radiusBtn, xaxis, side;
    let circle, hidCircle, btnCircle;
    let rootEle;                                
    let rootWidth, rootHeight;             
    let textLarge, textSmall, percent;
    let max = 100;
    let discRadius = 80;

    $: knobFillSolid =
        knobColor || gradientEnd || color || 'var(--color-primary-500, #22c55e)';
    $: knobFill = gradientStart && gradientEnd ? `url(#${knobGradientId})` : knobFillSolid;
    $: resolvedColor = gradientStart && gradientEnd ? `url(#${gradientId})` : color;
    $: calculate(value, rootWidth, rootHeight, resolvedColor, trackColor, textColor, thickness, checkable, checked, decimals);



    function calculate() { 
        newValue = (value > max ? max : value < 0 ? 0 : value) || 0;

        if (circle && hidCircle) { 
            let isPercent = thickness.slice(-1) == '%';
            let breadth = parseInt(thickness) || 5;
            let border = isPercent ? (breadth / 100) * rootWidth : breadth;

            side = rootWidth; 
            radius = (side - (border * 2)) / 2;
            radiusBtn = (radius - border) * (discRadius / 100);
            xaxis = radius;

            if (resolvedColor) { rootEle.style.setProperty('--def-circlebar-color', resolvedColor); }
            if (trackColor) { rootEle.style.setProperty('--def-circlebar-track', trackColor); }
            if (textColor) { rootEle.style.setProperty('--def-circlebar-text', textColor); }

            let dashValue = Math.round(2 * Math.PI * radius); 
            circle.style.strokeDashoffset = dashValue; 
            circle.style.strokeDasharray = dashValue; 

            circle.style.strokeWidth = border;
            circle.style.transform = `translate(${border}px, ${border}px)`;
            hidCircle.style.strokeWidth = border;
            hidCircle.style.transform = `translate(${border}px, ${border}px)`;
            hidCircle.style.transform = `translate(${border}px, ${border}px)`;

            if (checkable) { 
                btnCircle.style.transform = `translate(${border}px, ${border}px)`; 
            }

            if (decimals) {
                newValue = Math.round((newValue + Number.EPSILON) * 100) / 100;
            } else {
                newValue = Math.round(newValue);
            }

            circle.style.strokeDashoffset = dashValue - (dashValue * newValue) / 100;

            if (!checkable) {
                textLarge.style.fontSize = Math.max((radius / 2), 12) + 'px';
                if (info) {
                    textSmall.style.fontSize = Math.max((radius / 6.5), 7) + 'px';
                }
                percent.style.fontSize = Math.max((radius / 6.5), 11) + 'px';
            }

            if (showKnob) {
                const theta = (2 * Math.PI * newValue) / 100;
                knobX = xaxis + radius * Math.cos(theta);
                knobY = radius + radius * Math.sin(theta);

                knobOuterRadius = Math.max(10, Math.min(24, border * 1.25));
                knobCoreRadius = knobOuterRadius * 0.7;

                if (knobGroup) {
                    knobGroup.style.transform = `translate(${border}px, ${border}px)`;
                }
            } else {
                knobOuterRadius = 0;
                knobCoreRadius = 0;
            }
        }
    }
</script>

<section bind:clientWidth={rootWidth} bind:this={rootEle} class="circle">
    <div class="container">
        <svg>
	            {#if gradientStart && gradientEnd}
	                <defs>
	                    <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
	                        <stop offset="0%" stop-color={gradientStart}></stop>
	                        <stop offset="100%" stop-color={gradientEnd}></stop>
	                    </linearGradient>
	                    <linearGradient id={knobGradientId} x1="0%" y1="100%" x2="100%" y2="0%">
	                        <stop offset="0%" stop-color={gradientStart}></stop>
	                        <stop offset="100%" stop-color={gradientEnd}></stop>
	                    </linearGradient>
	                </defs>
	            {/if}
            <circle cx="{xaxis}" cy="{radius}" r="{radius}" bind:this={hidCircle}></circle>
            <circle cx="{xaxis}" cy="{radius}" r="{radius}" color="{resolvedColor}" bind:this={circle}></circle>
            {#if checkable}
                <circle cx="{xaxis}" cy="{radius}" r="{radiusBtn}" bind:this={btnCircle} class="btn" class:sel={checked} on:click={() => checked = !checked}></circle>
            {/if}
	            {#if showKnob}
	                <g bind:this={knobGroup} class="knob-group">
	                    <circle cx="{knobX}" cy="{knobY}" r="{knobOuterRadius}" class="knob-outer"></circle>
	                    <circle cx="{knobX}" cy="{knobY}" r="{knobCoreRadius}" class="knob-core" fill="{knobFill}" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1"></circle>
	                </g>
	            {/if}
        </svg>
        {#if !checkable}   
            <div class="info">
                <b bind:this={textLarge}>{newValue}</b><b bind:this={percent}>%</b>
                {#if info}
                    <br>
                    <div bind:this={textSmall}>{info}</div>
                {/if}
            </div>    
        {/if}       
    </div>
</section>

<style>

    div.container {
        width: 100%;
        height: 0;
        padding-bottom: 100%;
    }
    section {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        --def-circlebar-color: var(--color-primary-500, #22c55e);
        --def-circlebar-track: #223;
        --def-circlebar-text: #999;
    }

    svg {
        box-sizing: border-box;
        transform: rotate(270deg); 
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        overflow: visible;
    }

    svg > circle {
        width: 100%;
        height: 100%;  
        fill: transparent;
        stroke: var(--circlebar-track, var(--def-circlebar-track));
        stroke-linecap: round;
        transform: translate(5px, 5px);
        transition: all 0.2s ease;
    }

    svg > circle.btn {
        stroke-width: 0;
        fill: var(--circlebar-track, var(--def-circlebar-track));
        cursor: pointer;
    }

    svg > circle.btn.sel {
        stroke: var(--circlebar-color, var(--def-circlebar-color));
        fill: var(--circlebar-color, var(--def-circlebar-color));
    }    

    svg > circle:nth-of-type(2) {
        stroke: var(--circlebar-color, var(--def-circlebar-color));
    }

    .knob-group {
        pointer-events: none;
    }

    .knob-outer {
        fill: rgba(255, 255, 255, 0.95);
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
    }

    .knob-core {
        filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.25));
    }

    .info {
        position: absolute;
        color: #fff;
        text-transform: uppercase;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        white-space: pre-line;
    }

    .btn {
        position: absolute;
        color: #fff;
        box-sizing: border-box;
        padding: 50px;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;    
        
    }

    .info > div {
        font-weight: 400;
        width: 90%;
        margin: auto;
    }
</style>
