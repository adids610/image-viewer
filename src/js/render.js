import {
    CLASS_LOADING,
    CLASS_TRANSITION,
    EVENT_LOAD,
    EVENT_TRANSITION_END,
    EVENT_VIEWED,
    NAMESPACE
} from './constants';
import {
    addClass,
    addListener,
    assign,
    forEach,
    getImageNameFromURL,
    getImageNaturalSizes,
    getTransforms,
    removeClass,
    removeListener,
    setData,
    setStyle,
} from './utilities';

export default {
    render() {
        this.initContainer();
        this.initViewer();
        this.initList();
        this.renderViewer();
    },

    initBody() {
        const body = document.body;

        this.body = body;
        this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        this.initialBodyPaddingRight = body.style.paddingRight;
        this.initialBodyComputedPaddingRight = window.getComputedStyle(body).paddingRight;
    },

    initContainer() {
        this.containerData = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    },

    initViewer() {
        this.viewerData = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    },

    renderViewer() {

    },

    initList() {
        const {element, options, list} = this;
        const items = [];

        // initList may be called in this.update, so should keep idempotent
        list.innerHTML = '';

        forEach(this.images, (image, index) => {
            const item = document.createElement('li');
            const img = document.createElement('img');

            // forEach(options.inheritedAttributes, (name) => {
            //     const value = image.getAttribute(name);
            //
            //     if (value !== null) {
            //         img.setAttribute(name, value);
            //     }
            // });
            let url = "", name = "";
            if(typeof image === "string"){
                url = image;
            }else{
                url = image.url;
                name = image.name;
            }

            img.src = url;
            img.alt = name;
            img.setAttribute('data-index', index);
            img.setAttribute('data-original-url', url);
            img.setAttribute('data-viewer-action', 'view');
            img.setAttribute('role', 'button');
            item.appendChild(img);
            list.appendChild(item);
            items.push(item);
        });

        this.items = items;

        forEach(items, (item) => {
            const image = item.firstElementChild;

            setData(image, 'filled', true);

            if (options.loading) {
                addClass(item, CLASS_LOADING);
            }

            addListener(image, EVENT_LOAD, (event) => {
                if (options.loading) {
                    removeClass(item, CLASS_LOADING);
                }

                this.loadImage(event);
            }, {
                once: true,
            });
        });

        if (this.items.length >= 2) {
            removeClass(this.toolbar.querySelector(`.${NAMESPACE}-prev`), `${NAMESPACE}-hide`);
            removeClass(this.toolbar.querySelector(`.${NAMESPACE}-next`), `${NAMESPACE}-hide`);
        } else {
            addClass(this.toolbar.querySelector(`.${NAMESPACE}-prev`), `${NAMESPACE}-hide`);
            addClass(this.toolbar.querySelector(`.${NAMESPACE}-next`), `${NAMESPACE}-hide`);
        }

        if (options.transition) {
            addListener(element, EVENT_VIEWED, () => {
                addClass(list, CLASS_TRANSITION);
            }, {
                once: true,
            });
        }
    },

    renderList(index) {
        const i = index || this.index;
        const width = this.items[i].offsetWidth || 30;
        const outerWidth = width + 1; // 1 pixel of `margin-left` width

        // Place the active item in the center of the screen
        setStyle(this.list, assign({
            width: outerWidth * this.length,
        }, getTransforms({
            translateX: ((this.viewerData.width - width) / 2) - (outerWidth * i),
        })));
    },

    resetList() {
        const {list} = this;

        list.innerHTML = '';
        removeClass(list, CLASS_TRANSITION);
        setStyle(list, getTransforms({
            translateX: 0,
        }));
    },

    initImage(done) {
        const {options, image, viewerData} = this;
        const footerHeight = this.footer.offsetHeight;
        const viewerWidth = viewerData.width;
        const viewerHeight = Math.max(viewerData.height - footerHeight, footerHeight);
        const oldImageData = this.imageData || {};
        let sizingImage;

        this.imageInitializing = {
            abort: () => {
                sizingImage.onload = null;
            },
        };

        sizingImage = getImageNaturalSizes(image, options, (naturalWidth, naturalHeight) => {
            const aspectRatio = naturalWidth / naturalHeight;
            let width = viewerWidth;
            let height = viewerHeight;

            this.imageInitializing = false;

            if (viewerHeight * aspectRatio > viewerWidth) {
                height = viewerWidth / aspectRatio;
            } else {
                width = viewerHeight * aspectRatio;
            }

            width = Math.min(width * 0.9, naturalWidth);
            height = Math.min(height * 0.9, naturalHeight);

            const imageData = {
                naturalWidth,
                naturalHeight,
                aspectRatio,
                ratio: width / naturalWidth,
                width,
                height,
                left: (viewerWidth - width) / 2,
                top: (viewerHeight - height) / 2,
            };
            const initialImageData = assign({}, imageData);

            if (options.rotatable) {
                imageData.rotate = oldImageData.rotate || 0;
                initialImageData.rotate = 0;
            }

            if (options.scalable) {
                imageData.scaleX = oldImageData.scaleX || 1;
                imageData.scaleY = oldImageData.scaleY || 1;
                initialImageData.scaleX = 1;
                initialImageData.scaleY = 1;
            }

            this.imageData = imageData;
            this.initialImageData = initialImageData;

            if (done) {
                done();
            }
        });
    },

    renderImage(done) {
        const {image, imageData} = this;

        setStyle(image, assign({
            width: imageData.width,
            height: imageData.height,

            // XXX: Not to use translateX/Y to avoid image shaking when zooming
            marginLeft: imageData.left,
            marginTop: imageData.top,
        }, getTransforms(imageData)));

        if (done) {
            if ((this.viewing || this.zooming) && this.options.transition) {
                const onTransitionEnd = () => {
                    this.imageRendering = false;
                    done();
                };

                this.imageRendering = {
                    abort: () => {
                        removeListener(image, EVENT_TRANSITION_END, onTransitionEnd);
                    },
                };

                addListener(image, EVENT_TRANSITION_END, onTransitionEnd, {
                    once: true,
                });
            } else {
                done();
            }
        }
    },

    resetImage() {
        // this.image only defined after viewed
        if (this.viewing || this.viewed) {
            const {image} = this;

            if (this.viewing) {
                this.viewing.abort();
            }

            image.parentNode.removeChild(image);
            this.image = null;
        }
    },
};
