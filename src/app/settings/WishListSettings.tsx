import React from 'react';
import { t } from 'app/i18next-t';
import { connect } from 'react-redux';
import { RootState } from '../store/reducers';
import { clearWishLists } from '../wishlists/actions';
import HelpLink from '../dim-ui/HelpLink';
import { DropzoneOptions } from 'react-dropzone';
import FileUpload from '../dim-ui/FileUpload';
import { wishListsEnabledSelector, loadWishListAndInfoFromIndexedDB } from '../wishlists/reducer';
import _ from 'lodash';
import { setSetting } from './actions';
import { transformAndStoreWishList, fetchWishList } from 'app/wishlists/wishlist-fetch';
import { isUri } from 'valid-url';
import store from '../store/store';

interface StoreProps {
  wishListsEnabled: boolean;
  numWishListRolls: number;
  title?: string;
  description?: string;
  wishListSource?: string;
  wishListLastUpdated?: Date;
}

const mapDispatchToProps = {
  clearWishListAndInfo: clearWishLists,
  loadWishListAndInfoFromIndexedDB: loadWishListAndInfoFromIndexedDB as any,
  setSetting
};
type DispatchProps = typeof mapDispatchToProps;

type Props = StoreProps & DispatchProps;

function mapStateToProps(state: RootState): StoreProps {
  return {
    wishListsEnabled: wishListsEnabledSelector(state),
    numWishListRolls: state.wishLists.wishListAndInfo.wishListRolls.length,
    title: state.wishLists.wishListAndInfo.title,
    description: state.wishLists.wishListAndInfo.description,
    wishListSource: state.settings.wishListSource,
    wishListLastUpdated: state.settings.wishListLastUpdated
  };
}

interface State {
  wishListSource?: string;
  wishListLastUpdated?: Date;
}

class WishListSettings extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      wishListSource: props.wishListSource,
      // the prop's coming over as a string instead of a date
      wishListLastUpdated: props.wishListLastUpdated
        ? new Date(props.wishListLastUpdated)
        : undefined
    };
  }

  componentDidMount() {
    this.props.loadWishListAndInfoFromIndexedDB();
  }

  render() {
    const { wishListsEnabled, numWishListRolls, title, description } = this.props;
    const { wishListSource, wishListLastUpdated } = this.state;

    return (
      <section id="wishlist">
        <h2>
          {t('WishListRoll.Header')}
          <HelpLink helpLink="https://github.com/DestinyItemManager/DIM/blob/master/docs/COMMUNITY_CURATIONS.md" />
        </h2>
        {$featureFlags.wishLists && (
          <>
            <div className="setting">
              <FileUpload onDrop={this.loadWishList} title={t('WishListRoll.Import')} />
            </div>
            <div className="setting">
              <div>{t('WishListRoll.ExternalSource')}</div>
              <div>
                <input
                  type="text"
                  className="wish-list-text"
                  value={wishListSource}
                  onChange={this.updateWishListSourceState}
                  placeholder={t('WishListRoll.ExternalSource')}
                />
              </div>
              <div>
                <input
                  type="button"
                  className="dim-button"
                  value={t('WishListRoll.UpdateExternalSource')}
                  onClick={this.wishListUpdateEvent}
                />
              </div>
              {wishListLastUpdated && (
                <div className="fineprint">
                  {t('WishListRoll.LastUpdated', {
                    lastUpdatedDate: wishListLastUpdated.toLocaleDateString(),
                    lastUpdatedTime: wishListLastUpdated.toLocaleTimeString()
                  })}
                </div>
              )}
            </div>

            {wishListsEnabled && (
              <>
                <div className="setting">
                  <div className="horizontal">
                    <label>
                      {t('WishListRoll.Num', {
                        num: numWishListRolls
                      })}
                    </label>
                    <button className="dim-button" onClick={this.clearWishListEvent}>
                      {t('WishListRoll.Clear')}
                    </button>
                  </div>
                  {(title || description) && (
                    <div className="fineprint">
                      {title && (
                        <div className="overflow-dots">
                          <b>{title}</b>
                          <br />
                        </div>
                      )}
                      <div className="overflow-dots">{description}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    );
  }

  private wishListUpdateEvent = () => {
    let wishListSource = this.state.wishListSource;

    if (!isUri(wishListSource)) {
      alert(t('WishListRoll.InvalidExternalSource'));
      return;
    }

    wishListSource = wishListSource?.trim();

    store.dispatch(fetchWishList(true));

    this.setState({ wishListLastUpdated: new Date() });

    if (this.props.wishListSource === wishListSource) {
      return;
    }

    this.props.setSetting('wishListSource', wishListSource);
  };

  private loadWishList: DropzoneOptions['onDrop'] = (acceptedFiles) => {
    this.props.setSetting('wishListSource', undefined);
    this.setState({ wishListSource: '', wishListLastUpdated: undefined });

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        store.dispatch(transformAndStoreWishList(reader.result, 'Load Wish List'));
      }
    };

    const file = acceptedFiles[0];
    if (file) {
      reader.readAsText(file);
    } else {
      alert(t('WishListRoll.ImportNoFile'));
    }
    return false;
  };

  private clearWishListEvent = () => {
    this.props.setSetting('wishListSource', undefined);
    this.setState({ wishListSource: '', wishListLastUpdated: undefined });
    this.props.clearWishListAndInfo();
  };

  private updateWishListSourceState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSource = e.target.value;
    this.setState({ wishListSource: newSource });
  };
}

export default connect<StoreProps, DispatchProps>(
  mapStateToProps,
  mapDispatchToProps
)(WishListSettings);
