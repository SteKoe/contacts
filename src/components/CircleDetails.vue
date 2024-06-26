<!--
	- @copyright Copyright (c) 2021 John Molakvoæ <skjnldsv@protonmail.com>
	-
	- @author John Molakvoæ <skjnldsv@protonmail.com>
	-
	- @license GNU AGPL version 3 or any later version
	-
	- This program is free software: you can redistribute it and/or modify
	- it under the terms of the GNU Affero General Public License as
	- published by the Free Software Foundation, either version 3 of the
	- License, or (at your option) any later version.
	-
	- This program is distributed in the hope that it will be useful,
	- but WITHOUT ANY WARRANTY; without even the implied warranty of
	- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	- GNU Affero General Public License for more details.
	-
	- You should have received a copy of the GNU Affero General Public License
	- along with this program. If not, see <http://www.gnu.org/licenses/>.
	-
	-->

<template>
	<AppContentDetails>
		<!-- contact header -->
		<DetailsHeader>
			<!-- avatar and upload photo -->
			<template #avatar="{avatarSize}">
				<Avatar :disable-tooltip="true"
					:display-name="circle.displayName"
					:is-no-user="true"
					:size="avatarSize" />
			</template>

			<!-- display name -->
			<template #title>
				<div v-if="loadingName" class="circle-name__loader icon-loading-small" />
				<h2>
					{{ circle.displayName }}
				</h2>
			</template>

			<!-- org, title -->
			<template v-if="!circle.isOwner" #subtitle>
				{{ t('contacts', 'Team owned by {owner}', { owner: circle.owner.displayName}) }}
			</template>

			<template #actions>
				<!-- copy circle link -->
				<Button type="tertiary"
					:href="circleUrl"
					:title="copyButtonText"
					:class="copyLinkIcon"
					@click.stop.prevent="copyToClipboard(circleUrl)" />

				<!-- Team settings modal -->
				<Button v-if="(circle.isOwner || circle.isAdmin) && !circle.isPersonal" @click="showSettingsModal = true">
					<template #icon>
						<Cog :size="20" />
					</template>
					{{ t('contacts', 'Team settings') }}
				</Button>

				<!-- Only show the join button if the circle is accepting requests -->
				<Button v-if="!circle.isPendingMember && !circle.isMember && circle.canJoin"
					:disabled="loadingJoin"
					class="primary"
					@click="joinCircle">
					<template #icon>
						<Login :size="16" />
					</template>
					{{ t('contacts', 'Request to join') }}
				</Button>
			</template>
		</DetailsHeader>

		<section v-if="showDescription" class="circle-details-section">
			<ContentHeading :loading="loadingDescription">
				{{ t('contacts', 'Description') }}
			</ContentHeading>

			<RichContenteditable :value.sync="circle.description"
				:auto-complete="onAutocomplete"
				:maxlength="1024"
				:multiline="true"
				:contenteditable="false"
				:placeholder="descriptionPlaceholder"
				class="circle-details-section__description"
				@update:value="onDescriptionChangeDebounce" />
		</section>

		<section v-if="circle.isMember" class="circle-details-section">
			<ContentHeading>
				{{ t('contacts', 'Members') }}
			</ContentHeading>
			<div ref="avatarList" class="avatar-list">
				<Avatar v-for="member in membersLimited"
					:key="member.singleId"
					:user="member.userId"
					:display-name="member.displayName"
					:is-no-user="!member.isUser"
					:size="44" />
				<Button @click="showMembersModal = true">
					<template #icon>
						<AccountMultiplePlus :size="20" />
					</template>
					{{ t('contacts', 'Add members') }}
				</Button>
			</div>
			<Modal v-if="showMembersModal" @close="showMembersModal=false">
				<div class="members-modal">
					<h2>{{ t('contacts', 'Team members') }}</h2>
					<MemberList :list="members" />
				</div>
			</Modal>
		</section>

		<section>
			<ContentHeading>
				{{ t('contacts', 'Team resources') }}
			</ContentHeading>
			<p>{{ t('contacts', 'Anything shared with this team will show up here') }}</p>
			<div v-for="provider in resourceProviders" :key="provider.id">
				<ContentHeading>
					<span v-show="false" class="provider__icon" v-html="provider.icon" /> {{ provider.name }}
				</ContentHeading>

				<ul>
					<ListItem v-for="resource in resourcesForProvider(provider.id)"
						:key="resource.url"
						class="resource"
						:name="resource.label"
						:href="resource.url">
						<template #icon>
							<span v-if="resource.iconEmoji" class="resource__icon">
								{{ resource.iconEmoji }}
							</span>
							<span v-else-if="resource.iconSvg" class="resource__icon" v-html="resource.iconSvg" />
							<span v-else-if="resource.iconURL" class="resource__icon">
								<img :src="resource.iconURL" alt="">
							</span>
						</template>
					</ListItem>
				</ul>
			</div>
		</section>

		<Modal v-if="(circle.isOwner || circle.isAdmin) && !circle.isPersonal && showSettingsModal" @close="showSettingsModal=false">
			<div class="circle-settings">
				<h2>{{ t('contacts', 'Team settings') }}</h2>

				<h3>{{ t('contacts', 'Team name') }}</h3>
				<input v-model="circle.displayName"
					:readonly="!circle.isOwner"
					:placeholder="t('contacts', 'Team name')"
					type="text"
					autocomplete="off"
					autocorrect="off"
					spellcheck="false"
					name="displayname"
					@input="onNameChangeDebounce">

				<h3>{{ t('contacts', 'Description') }}</h3>
				<RichContenteditable :value.sync="circle.description"
					:auto-complete="onAutocomplete"
					:maxlength="1024"
					:multiline="true"
					:contenteditable="circle.isOwner"
					:placeholder="descriptionPlaceholder"
					class="circle-details-section__description"
					@update:value="onDescriptionChangeDebounce" />

				<h3>{{ t('contacts', 'Settings') }}</h3>
				<CircleConfigs class="circle-details-section__configs" :circle="circle" />
				<CirclePasswordSettings class="circle-details-section__configs" :circle="circle" />

				<h3>{{ t('contacts', 'Actions') }}</h3>
				<!-- leave circle -->
				<Button v-if="circle.canLeave"
					type="warning"
					@click="confirmLeaveCircle">
					<template #icon>
						<Logout :size="16" />
					</template>
					{{ t('contacts', 'Leave team') }}
				</Button>

				<!-- delete circle -->
				<Button v-if="circle.canDelete"
					type="error"
					href="#"
					@click.prevent.stop="confirmDeleteCircle">
					<template #icon>
						<IconDelete :size="20" />
					</template>
					{{ t('contacts', 'Delete team') }}
				</Button>
			</div>
		</Modal>

		<section v-else>
			<slot />
		</section>
	</AppContentDetails>
</template>

<script>
import { showError } from '@nextcloud/dialogs'
import debounce from 'debounce'
import { useResizeObserver } from '@vueuse/core'

import {
	NcAppContentDetails as AppContentDetails,
	NcAvatar as Avatar,
	NcButton as Button,
	NcListItem as ListItem,
	NcModal as Modal,
	NcRichContenteditable as RichContenteditable,
} from '@nextcloud/vue'

import Cog from 'vue-material-design-icons/Cog.vue'
import Login from 'vue-material-design-icons/Login.vue'
import Logout from 'vue-material-design-icons/Logout.vue'
import IconDelete from 'vue-material-design-icons/Delete.vue'
import AccountMultiplePlus from 'vue-material-design-icons/AccountMultiplePlus.vue'

import { CircleEdit, editCircle } from '../services/circles.ts'
import CircleActionsMixin from '../mixins/CircleActionsMixin.js'
import DetailsHeader from './DetailsHeader.vue'
import CircleConfigs from './CircleDetails/CircleConfigs.vue'
import MemberList from './MemberList.vue'
import ContentHeading from './CircleDetails/ContentHeading.vue'
import CirclePasswordSettings from './CircleDetails/CirclePasswordSettings.vue'
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'

export default {
	name: 'CircleDetails',

	components: {
		AppContentDetails,
		Avatar,
		MemberList,
		Button,
		CircleConfigs,
		CirclePasswordSettings,
		ContentHeading,
		DetailsHeader,
		ListItem,
		Cog,
		Login,
		Logout,
		Modal,
		IconDelete,
		AccountMultiplePlus,
		RichContenteditable,
	},

	mixins: [CircleActionsMixin],

	data() {
		return {
			loadingDescription: false,
			loadingName: false,
			showSettingsModal: false,
			showMembersModal: false,
			resources: null,
			memberLimit: 1,
		}
	},

	computed: {
		descriptionPlaceholder() {
			if (this.circle.description.trim() === '') {
				return t('contacts', 'There is no description for this team')
			}
			return t('contacts', 'Enter a description for the team')
		},

		isEmptyDescription() {
			return this.circle.description.trim() === ''
		},

		showDescription() {
			if (this.circle.isOwner) {
				return true
			}
			return !this.isEmptyDescription
		},

		members() {
			return Object.values(this.$store.getters.getCircle(this.circle.id)?.members || [])
		},

		membersLimited() {
			return this.members.slice(0, this.memberLimit)
		},

		resourceProviders() {
			return this.resources?.reduce((acc, res) => {
				if (!acc.find(p => p.id === res.provider.id)) {
					acc.push(res.provider)
				}
				return acc
			}, []) ?? []
		},

		resourcesForProvider() {
			return (providerId) => {
				return this.resources?.filter(res => res.provider.id === providerId) ?? []
			}
		},
	},

	watch: {
		'circle.id': {
			handler() {
				this.fetchTeamResources()
			},
			immediate: true,
		},
	},

	mounted() {
		this.updateMemberLimit()
		useResizeObserver(this.$refs.avatarList, () => {
			this.updateMemberLimit()
		})
	},

	methods: {
		async fetchTeamResources() {
			const response = await axios.get(generateOcsUrl(`/teams/${this.circle.id}/resources`))
			this.resources = response.data.ocs.data.resources
		},
		/**
		 * Autocomplete @mentions on the description
		 *
		 * @param {string} search the search term
		 * @param {Function} callback callback to be called with results array
		 */
		onAutocomplete(search, callback) {
			// TODO: implement autocompletion. Disabled for now
			// eslint-disable-next-line n/no-callback-literal
			callback([])
		},

		onDescriptionChangeDebounce: debounce(function(...args) {
			this.onDescriptionChange(...args)
		}, 500),
		async onDescriptionChange(description) {
			this.loadingDescription = true
			try {
				await editCircle(this.circle.id, CircleEdit.Description, description)
			} catch (error) {
				console.error('Unable to edit team description', description, error)
				showError(t('contacts', 'An error happened during description sync'))
			} finally {
				this.loadingDescription = false
			}
		},

		onNameChangeDebounce: debounce(function(event) {
			this.onNameChange(event.target.value)
		}, 500),
		async onNameChange(name) {
			this.loadingName = true
			try {
				await editCircle(this.circle.id, CircleEdit.Name, name)
			} catch (error) {
				console.error('Unable to edit name', name, error)
				showError(t('contacts', 'An error happened during name sync'))
			} finally {
				this.loadingName = false
			}
		},
		updateMemberLimit() {
			this.memberLimit = Math.floor((this.$refs.avatarList.clientWidth - 44) / 44)
			console.error(this.memberLimit)
		},
	},
}
</script>

<style lang="scss" scoped>
.app-content-details header,
.app-content-details section {
	max-width: 800px;
	margin: auto;
	margin-bottom: 36px;

	&:deep(.contact-header__avatar) {
		width: 75px;
	}

	&:deep(.contact-header__no-wrap) {
		flex-grow: 1;
	}

	&:deep(.contact-header__actions) {
		flex-grow: 0;
	}
}

.circle-name__loader {
	margin-left: 8px;
}

.circle-details-section {
	&:not(:first-of-type) {
		margin-top: 24px;
	}

	&__actions {
		display: flex;
		a, button {
			margin-right: 8px;
		}
	}

	&__description {
		max-width: 800px;
	}
}

.avatar-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.members-modal {
	padding: 12px;

	h2 {
		margin-bottom: 16px;
	}

	:deep(.app-content-list) {
		max-width: 100%;
		border: 0;
	}
}

.circle-settings {
	margin: 12px;
}

.provider__icon {
	display: inline-block;
	width: 24px;
	height: 24px;
}
.resource {
	&__icon {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		svg {
			width: 20px;
			height: 20px;
		}
		img {
			border-radius: var(--border-radius-pill);
			overflow: hidden;
			width: 32px;
			height: 32px;
		}
	}

	&:deep(.line-one__name) {
		font-weight: normal;
	}
}
</style>
