




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
        ctx.font = `bold ${ctaFontSize}px ${state.font}`;
        const ctaMetrics = ctx.measureText(state.cta);
        const ctaWidth = ctaMetrics.width + padding * 1.5;
        const ctaHeight = ctaFontSize * 1.5 + padding * 0.5;
        const ctaX = width * (state.ctaPosition.x / 100) - ctaWidth / 2;
        const ctaY = height * (state.ctaPosition.y / 100) - ctaHeight / 2;
        
        ctx.fillStyle = state.backgroundColor;
        ctx.fillRect(ctaX, ctaY, ctaWidth, ctaHeight);
        
        ctx.save();
        if (state.textShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }
        
        const ctaFont = `bold ${ctaFontSize}px ${state.font}`;
        const ctaTextY = ctaY + ctaHeight / 2 + ctaFontSize / 3; // Better vertical alignment
        
        if (state.textOutline) {
            drawWrappedText(ctx, state.cta, ctaX + ctaWidth / 2, ctaTextY, ctaWidth, ctaFontSize, ctaFont, state.textOutlineColor, 'center', 'stroke', state.textOutlineWidth);
        }
        drawWrappedText(ctx, state.cta, ctaX + ctaWidth / 2, ctaTextY, ctaWidth, ctaFontSize, ctaFont, state.textColor, 'center', 'fill');
        ctx.restore();

        rects.cta = new DOMRectReadOnly(ctaX, ctaY, ctaWidth, ctaHeight);
    }
    
    return rects;
}

const drawLogo = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: AdCreativeState,
    logoImg?: HTMLImageElement
): DOMRectReadOnly => {
    let rect = new DOMRectReadOnly();
    if (state.showLogo && logoImg) {
        const { width, height } = canvas;
        const logoWidth = width * (state.logoScale / 100);
        const scale = logoWidth / logoImg.naturalWidth;
        const logoHeight = logoImg.naturalHeight * scale;
        const logoX = width * (state.logoPosition.x / 100) - logoWidth / 2;
        const logoY = height * (state.logoPosition.y / 100) - logoHeight / 2;
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        rect = new DOMRectReadOnly(logoX, logoY, logoWidth, logoHeight);
    }
    return rect;
}

const standardTemplateDraw: DrawFunction = (ctx, canvas, state, logoImg) => {
    const textRects = drawTextElements(ctx, canvas, state);
    const logoRect = drawLogo(ctx, canvas, state, logoImg);
    return { ...textRects, logo: logoRect };
};


export const adTemplates: AdTemplate[] = [
    {
        id: 'standard-v1',
        name: 'Standard',
        icon: TemplateStandardIcon,
        draw: standardTemplateDraw
    },
    {
        id: 'overlay-v1',
        name: 'Overlay',
        icon: TemplateOverlayIcon,
        draw: (ctx, canvas, state, logoImg) => {
            const { width, height } = canvas;
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
            return standardTemplateDraw(ctx, canvas, state, logoImg);
        }
    },
    {
        id: 'facebook-feed',
        name: 'Facebook',
        icon: FacebookIcon,
        draw: standardTemplateDraw // uses standard for now, can be customized
    },
    {
        id: 'instagram-story',
        name: 'Story',
        icon: InstagramIcon,
        draw: standardTemplateDraw // uses standard for now, can be customized
    },
    {
        id: 'tiktok-ad',
        name: 'TikTok',
        icon: TikTokIcon,
        draw: standardTemplateDraw // uses standard for now, can be customized
    },
     {
        id: 'shopify-main',
        name: 'Shopify',
        icon: ShopifyIcon,
        draw: standardTemplateDraw
    },
    {
        id: 'etsy-listing',
        name: 'Etsy',
        icon: EtsyIcon,
        draw: standardTemplateDraw
    },
    {
        id: 'ebay-listing',
        name: 'eBay',
        icon: EbayIcon,
        draw: standardTemplateDraw
    }
];