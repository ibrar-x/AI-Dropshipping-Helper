
import React from 'react';
// FIX: Correct import path for types.
import { AdCreativeState, AdTemplate } from './types';
import { drawWrappedText } from './utils/imageUtils';
import { TemplateStandardIcon } from './components/icons/TemplateStandardIcon';
import { TemplateOverlayIcon } from './components/icons/TemplateOverlayIcon';
import { FacebookIcon } from './components/icons/FacebookIcon';
import { InstagramIcon } from './components/icons/InstagramIcon';
import { TikTokIcon } from './components/icons/TikTokIcon';
import { ShopifyIcon } from './components/icons/ShopifyIcon';
import { EtsyIcon } from './components/icons/EtsyIcon';
import { EbayIcon } from './components/icons/EbayIcon';


// The draw function now returns the bounding boxes of the draggable elements
type DrawFunction = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AdCreativeState,
    logoImg?: HTMLImageElement
) => {
    logo: DOMRectReadOnly;
    headline: DOMRectReadOnly;
    cta: DOMRectReadOnly;
} | void;


const drawTextElements = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AdCreativeState,
): { headline: DOMRectReadOnly; cta: DOMRectReadOnly; } => {
    const { width, height } = canvas;
    const padding = width * 0.05;

    const rects = {
        headline: new DOMRectReadOnly(),
        cta: new DOMRectReadOnly(),
    };

    // Headline
    if (state.showHeadline && state.headline) {
        const headlineFontSize = width * (state.headlineSize / 100);
        const font = `bold ${headlineFontSize}px ${state.font}`;
        const x = width * (state.headlinePosition.x / 100);
        const y = height * (state.headlinePosition.y / 100);
        
        ctx.save();
        if (state.textShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
        }

        if (state.textOutline) {
            drawWrappedText(ctx, state.headline, x, y, width - padding * 2, headlineFontSize * 1.2, font, state.textOutlineColor, state.headlineAlign, 'stroke', state.textOutlineWidth);
        }
        drawWrappedText(ctx, state.headline, x, y, width - padding * 2, headlineFontSize * 1.2, font, state.textColor, state.headlineAlign, 'fill');
        ctx.restore();

        // Approximate bounding box for dragging
        const textMetrics = ctx.measureText(state.headline);
        const boxWidth = Math.min(width - padding * 2, textMetrics.width * 1.2); // Add some padding
        const boxHeight = headlineFontSize * 1.5;
        let boxX = x;
        if (state.headlineAlign === 'center') boxX = x - boxWidth / 2;
        if (state.headlineAlign === 'right') boxX = x - boxWidth;
        rects.headline = new DOMRectReadOnly(boxX, y - headlineFontSize, boxWidth, boxHeight * 1.5);
    }

    // CTA Button
    if (state.showCta && state.cta) {
        const ctaFontSize = width * (state.ctaSize / 100);
        const ctaFont = `bold ${ctaFontSize}px ${state.font}`;
        ctx.font = ctaFont;
        const ctaTextMetrics = ctx.measureText(state.cta);
        const ctaWidth = ctaTextMetrics.width + padding;
        const ctaHeight = ctaFontSize * 1.8;
        const ctaX = width * (state.ctaPosition.x / 100) - ctaWidth / 2;
        const ctaY = height * (state.ctaPosition.y / 100) - ctaHeight / 2;
        const borderRadius = ctaHeight / 2;

        ctx.save();
        ctx.fillStyle = state.backgroundColor;
        if (state.textShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        // Draw rounded rectangle for CTA button
        ctx.beginPath();
        ctx.moveTo(ctaX + borderRadius, ctaY);
        ctx.lineTo(ctaX + ctaWidth - borderRadius, ctaY);
        ctx.quadraticCurveTo(ctaX + ctaWidth, ctaY, ctaX + ctaWidth, ctaY + borderRadius);
        ctx.lineTo(ctaX + ctaWidth, ctaY + ctaHeight - borderRadius);
        ctx.quadraticCurveTo(ctaX + ctaWidth, ctaY + ctaHeight, ctaX + ctaWidth - borderRadius, ctaY + ctaHeight);
        ctx.lineTo(ctaX + borderRadius, ctaY + ctaHeight);
        ctx.quadraticCurveTo(ctaX, ctaY + ctaHeight, ctaX, ctaY + ctaHeight - borderRadius);
        ctx.lineTo(ctaX, ctaY + borderRadius);
        ctx.quadraticCurveTo(ctaX, ctaY, ctaX + borderRadius, ctaY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw CTA text
        ctx.fillStyle = state.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = ctaFont;
        ctx.fillText(state.cta, ctaX + ctaWidth / 2, ctaY + ctaHeight / 2);

        rects.cta = new DOMRectReadOnly(ctaX, ctaY, ctaWidth, ctaHeight);
    }

    // FIX: Added return statement to satisfy the function's declared return type.
    return rects;
};

const drawStandardTemplate: DrawFunction = (ctx, canvas, state, logoImg) => {
    const textRects = drawTextElements(ctx, canvas, state);
    
    let logoRect = new DOMRectReadOnly();

    if (state.showLogo && logoImg) {
        const logoScale = canvas.width * (state.logoScale / 100);
        const logoAspectRatio = logoImg.width / logoImg.height;
        const logoWidth = logoScale;
        const logoHeight = logoScale / logoAspectRatio;
        const logoX = canvas.width * (state.logoPosition.x / 100) - logoWidth / 2;
        const logoY = canvas.height * (state.logoPosition.y / 100) - logoHeight / 2;
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        logoRect = new DOMRectReadOnly(logoX, logoY, logoWidth, logoHeight);
    }

    return {
        logo: logoRect,
        headline: textRects.headline,
        cta: textRects.cta,
    };
};

// FIX: Export the adTemplates array so it can be imported by other modules.
export const adTemplates: AdTemplate[] = [
    {
        id: 'standard-v1',
        name: 'Standard',
        icon: TemplateStandardIcon,
        draw: drawStandardTemplate,
    },
    // Future templates could be added here
];
